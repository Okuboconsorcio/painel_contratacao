/**
 * O motor do processo: cada passo que a equipe dá numa candidatura.
 *
 * Toda função aqui recebe o banco já aberto, confere se o passo é permitido
 * naquela etapa, altera, **grava uma linha no histórico** (regra 2: todo contato
 * fica registrado, inclusive os negativos) e põe na fila os e-mails que o passo
 * dispara. Não sabe nada de tela nem de permissão — isso é das ações
 * (`actions.ts`), que chamam estas funções dentro de `transacao`.
 *
 * No Polaris, cada função vira uma função do banco (`security definer`, com
 * `pode()` por dentro), como já é feito em `definir_status_auditoria`: a etapa
 * só muda por um caminho, e o histórico não depende de alguém lembrar.
 */

import { hoje } from "./datas.ts";
import {
  agendarEmail,
  agendarLembretes,
  agendarNegativa,
  cancelarPendentes,
} from "./emails.ts";
import { CANAIS, CRITERIOS_ENTREVISTA, CRITERIOS_TRIAGEM, DADOS_FICHA, ETAPAS, RESULTADOS_CONTATO } from "./opcoes.ts";
import {
  acoesDaEtapa,
  avisosInicio,
  faltaParaAbrir,
  gerarSlug,
  guardarAte,
  media,
  notaValida,
  validarDataInicio,
  type Acao,
} from "./regras.ts";
import type {
  Arquivo,
  Avaliacao,
  Banco,
  CanalContato,
  Candidato,
  Candidatura,
  Etapa,
  ResultadoContato,
  Vaga,
} from "./tipos.ts";

/** Erro de regra: a mensagem vai direto para a tela. */
export class ErroRegra extends Error {}

function id(prefixo: string) {
  return `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function achar(banco: Banco, candidaturaId: string): Candidatura {
  const c = banco.candidaturas.find((x) => x.id === candidaturaId);
  if (!c) throw new ErroRegra("Candidatura não encontrada.");
  return c;
}

function exigirAcao(c: Candidatura, acao: Acao) {
  if (!acoesDaEtapa(c.etapa).includes(acao)) {
    throw new ErroRegra(
      `Esta ação não vale para quem está em "${ETAPAS[c.etapa].rotulo}". A tela pode estar desatualizada — recarregue.`
    );
  }
}

export function registrarEvento(
  banco: Banco,
  dados: {
    candidato_id: string;
    candidatura_id: string | null;
    tipo: string;
    texto: string;
    de?: Etapa | null;
    para?: Etapa | null;
  },
  quem: string,
  agora: Date
) {
  banco.eventos.push({
    id: id("ev"),
    candidato_id: dados.candidato_id,
    candidatura_id: dados.candidatura_id,
    tipo: dados.tipo,
    de: dados.de ?? null,
    para: dados.para ?? null,
    texto: dados.texto,
    por: quem,
    em: agora.toISOString(),
  });
}

function mudarEtapa(
  banco: Banco,
  c: Candidatura,
  para: Etapa,
  texto: string,
  quem: string,
  agora: Date
) {
  const de = c.etapa;
  if (ETAPAS[para].encerrada && !ETAPAS[de].encerrada) c.etapa_encerramento = de;
  if (!ETAPAS[para].encerrada) {
    c.etapa_encerramento = null;
    c.motivo_encerramento = "";
  }
  c.etapa = para;
  c.atualizado_em = agora.toISOString();
  registrarEvento(
    banco,
    { candidato_id: c.candidato_id, candidatura_id: c.id, tipo: "ETAPA", texto, de, para },
    quem,
    agora
  );
}

// ─── Inscrição ─────────────────────────────────────────────────────────────

export type DadosCandidato = Pick<
  Candidato,
  "nome" | "email" | "telefone" | "cidade" | "bairro" | "origem" | "resumo" | "observacoes"
> & { data_nascimento: string | null; consentimento: boolean };

const soDigitos = (t: string) => t.replace(/\D/g, "");

export function validarCandidato(d: DadosCandidato) {
  if (d.nome.trim().split(/\s+/).length < 2) throw new ErroRegra("Informe nome e sobrenome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) throw new ErroRegra("E-mail inválido.");
  const fone = soDigitos(d.telefone);
  if (fone.length < 10 || fone.length > 11) throw new ErroRegra("Telefone com DDD, 10 ou 11 dígitos.");
  if (!d.consentimento) {
    throw new ErroRegra("Sem o aceite para guardar os dados (LGPD), o currículo não pode entrar no banco.");
  }
}

/** O mesmo candidato não vira duas fichas: procura por e-mail e por telefone. */
export function acharCandidatoExistente(banco: Banco, email: string, telefone: string) {
  const e = email.trim().toLowerCase();
  const f = soDigitos(telefone);
  return banco.candidatos.find((c) => c.email.toLowerCase() === e || soDigitos(c.telefone) === f) ?? null;
}

/**
 * Inscreve numa vaga. Serve à landing page (quem = null) e ao cadastro manual
 * pela equipe. Se a pessoa já existe no banco de currículos, atualiza a ficha e
 * cria só a candidatura nova.
 */
export function inscrever(
  banco: Banco,
  dados: DadosCandidato,
  vagaId: string,
  curriculo: Arquivo | null,
  quem: string | null,
  agora: Date
): { candidato: Candidato; candidatura: Candidatura; jaExistia: boolean } {
  validarCandidato(dados);
  const vaga = banco.vagas.find((v) => v.id === vagaId);
  if (!vaga) throw new ErroRegra("Vaga não encontrada.");
  if (vaga.situacao !== "ABERTA" && (quem === null || vaga.situacao === "ENCERRADA")) {
    throw new ErroRegra("Esta vaga não está recebendo inscrições.");
  }

  const iso = agora.toISOString();
  let candidato = acharCandidatoExistente(banco, dados.email, dados.telefone);
  const jaExistia = !!candidato;

  if (candidato) {
    const ativa = banco.candidaturas.find(
      (c) => c.candidato_id === candidato!.id && c.vaga_id === vagaId && !ETAPAS[c.etapa].encerrada
    );
    if (ativa) throw new ErroRegra("Esta pessoa já está participando desta vaga.");
    Object.assign(candidato, {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      telefone: dados.telefone.trim(),
      cidade: dados.cidade.trim() || candidato.cidade,
      bairro: dados.bairro.trim() || candidato.bairro,
      resumo: dados.resumo.trim() || candidato.resumo,
      data_nascimento: dados.data_nascimento || candidato.data_nascimento,
      consentimento_em: iso,
    });
    if (curriculo) candidato.curriculo = curriculo;
  } else {
    candidato = {
      id: id("cand"),
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      telefone: dados.telefone.trim(),
      cidade: dados.cidade.trim(),
      bairro: dados.bairro.trim(),
      data_nascimento: dados.data_nascimento,
      origem: dados.origem || "Outro",
      resumo: dados.resumo.trim(),
      observacoes: dados.observacoes.trim(),
      curriculo,
      consentimento_em: iso,
      criado_em: iso,
      criado_por: quem,
    };
    banco.candidatos.push(candidato);
  }

  const candidatura: Candidatura = {
    id: id("ctr"),
    candidato_id: candidato.id,
    vaga_id: vagaId,
    etapa: "INSCRITO",
    etapa_encerramento: null,
    motivo_encerramento: "",
    triagem: null,
    entrevista: null,
    avaliacao: null,
    decisao: null,
    data_inicio: null,
    confirmado_em: null,
    criado_em: iso,
    atualizado_em: iso,
  };
  banco.candidaturas.push(candidatura);

  registrarEvento(
    banco,
    {
      candidato_id: candidato.id,
      candidatura_id: candidatura.id,
      tipo: "INSCRICAO",
      texto: quem
        ? `Cadastrado pela equipe na vaga ${vaga.titulo} (origem: ${dados.origem || "Outro"}).`
        : `Inscreveu-se pela landing page na vaga ${vaga.titulo}.`,
      para: "INSCRITO",
    },
    quem ?? "Landing page",
    agora
  );

  agendarEmail(banco, "CONFIRMACAO_CANDIDATURA", candidatura, iso, agora);
  return { candidato, candidatura, jaExistia };
}

export function editarCandidato(
  banco: Banco,
  candidatoId: string,
  dados: Omit<DadosCandidato, "consentimento">,
  curriculo: Arquivo | null,
  quem: string,
  agora: Date
) {
  const c = banco.candidatos.find((x) => x.id === candidatoId);
  if (!c) throw new ErroRegra("Candidato não encontrado.");
  validarCandidato({ ...dados, consentimento: true });
  const outro = acharCandidatoExistente(banco, dados.email, dados.telefone);
  if (outro && outro.id !== c.id) {
    throw new ErroRegra(`Este e-mail ou telefone já é de ${outro.nome}.`);
  }
  Object.assign(c, {
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    telefone: dados.telefone.trim(),
    cidade: dados.cidade.trim(),
    bairro: dados.bairro.trim(),
    origem: dados.origem,
    resumo: dados.resumo.trim(),
    observacoes: dados.observacoes.trim(),
    data_nascimento: dados.data_nascimento,
  });
  if (curriculo) c.curriculo = curriculo;
  registrarEvento(
    banco,
    {
      candidato_id: c.id,
      candidatura_id: null,
      tipo: "FICHA",
      texto: curriculo ? "Ficha atualizada e currículo substituído." : "Ficha atualizada.",
    },
    quem,
    agora
  );
}

// ─── Triagem ───────────────────────────────────────────────────────────────

export function registrarTriagem(
  banco: Banco,
  candidaturaId: string,
  dados: {
    notas: Record<string, number>;
    comentario: string;
    decisao: "APROVADO" | "REPROVADO" | "RESERVA";
    motivo: string;
  },
  quem: string,
  agora: Date
) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "triagem");

  const valores = CRITERIOS_TRIAGEM.map((k) => dados.notas[k.chave]);
  if (valores.some((n) => !notaValida(n))) throw new ErroRegra("Dê nota de 0 a 10 em todos os critérios.");
  if (dados.decisao !== "APROVADO" && !dados.motivo.trim()) {
    throw new ErroRegra("Informe o motivo — ele aparece nos indicadores.");
  }

  c.triagem = {
    notas: dados.notas,
    nota_geral: media(valores),
    comentario: dados.comentario.trim(),
    decisao: dados.decisao,
    por: quem,
    em: agora.toISOString(),
  };

  const nota = `nota ${c.triagem.nota_geral.toLocaleString("pt-BR")}`;
  if (dados.decisao === "APROVADO") {
    mudarEtapa(banco, c, "TRIAGEM_APROVADA", `Aprovado na triagem (${nota}).`, quem, agora);
  } else if (dados.decisao === "RESERVA") {
    c.motivo_encerramento = dados.motivo.trim();
    mudarEtapa(banco, c, "RESERVA", `Triagem: guardado no banco de reserva (${nota}) — ${dados.motivo.trim()}.`, quem, agora);
  } else {
    c.motivo_encerramento = dados.motivo.trim();
    mudarEtapa(banco, c, "REPROVADO", `Reprovado na triagem (${nota}) — ${dados.motivo.trim()}.`, quem, agora);
    agendarNegativa(banco, "REPROVADO_TRIAGEM", c, agora);
  }
}

// ─── Contato e entrevista ──────────────────────────────────────────────────

export type DadosEntrevista = {
  data_hora: string;
  local: string;
  entrevistadores: string;
  supervisora: string;
};

function validarEntrevista(e: DadosEntrevista | null, agora: Date): DadosEntrevista {
  if (!e || !e.data_hora) throw new ErroRegra("Informe dia e hora da entrevista.");
  if (Number.isNaN(new Date(e.data_hora).getTime())) throw new ErroRegra("Dia ou hora inválidos.");
  if (e.data_hora < agora.toISOString()) throw new ErroRegra("A entrevista não pode ser marcada no passado.");
  return e;
}

export function registrarContato(
  banco: Banco,
  candidaturaId: string,
  dados: {
    canal: CanalContato;
    resultado: ResultadoContato;
    observacao: string;
    entrevista: DadosEntrevista | null;
  },
  quem: string,
  agora: Date
) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "contato");
  const info = RESULTADOS_CONTATO[dados.resultado];
  if (!info) throw new ErroRegra("Escolha o resultado do contato.");
  const entrevista = info.agenda ? validarEntrevista(dados.entrevista, agora) : null;

  banco.contatos.push({
    id: id("con"),
    candidatura_id: c.id,
    canal: dados.canal,
    resultado: dados.resultado,
    observacao: dados.observacao.trim(),
    por: quem,
    em: agora.toISOString(),
  });

  const obs = dados.observacao.trim() ? ` — ${dados.observacao.trim()}` : "";
  const canal = (CANAIS[dados.canal] ?? dados.canal).replace("Ligação", "ligação").replace("E-mail", "e-mail");

  if (entrevista) {
    c.entrevista = {
      ...entrevista,
      local: entrevista.local.trim() || banco.config.endereco_entrevista,
      agendada_por: quem,
      agendada_em: agora.toISOString(),
      remarcacoes: 0,
    };
    mudarEtapa(banco, c, "ENTREVISTA_AGENDADA", `Contato por ${canal}: entrevista marcada${obs}.`, quem, agora);
    agendarEmail(banco, "ENTREVISTA_AGENDADA", c, agora.toISOString(), agora);
    agendarLembretes(banco, c, agora);
  } else if (info.encerra) {
    c.motivo_encerramento = info.rotulo;
    mudarEtapa(banco, c, "DESISTIU", `Contato por ${canal}: ${info.rotulo.toLowerCase()}${obs}.`, quem, agora);
  } else {
    registrarEvento(
      banco,
      {
        candidato_id: c.candidato_id,
        candidatura_id: c.id,
        tipo: "CONTATO",
        texto: `Contato por ${canal}: ${info.rotulo.toLowerCase()}${obs}.`,
      },
      quem,
      agora
    );
    c.atualizado_em = agora.toISOString();
  }
}

export function remarcarEntrevista(
  banco: Banco,
  candidaturaId: string,
  dados: DadosEntrevista & { motivo: string },
  quem: string,
  agora: Date
) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "remarcar");
  const e = validarEntrevista(dados, agora);
  cancelarPendentes(banco, c.id, "entrevista remarcada", [
    "LEMBRETE_ENTREVISTA",
    "LEMBRETE_ENTREVISTA_EQUIPE",
  ]);
  c.entrevista = {
    ...c.entrevista!,
    ...e,
    local: e.local.trim() || banco.config.endereco_entrevista,
    remarcacoes: (c.entrevista?.remarcacoes ?? 0) + 1,
  };
  c.atualizado_em = agora.toISOString();
  registrarEvento(
    banco,
    {
      candidato_id: c.candidato_id,
      candidatura_id: c.id,
      tipo: "REMARCACAO",
      texto: `Entrevista remarcada${dados.motivo.trim() ? ` — ${dados.motivo.trim()}` : ""}.`,
    },
    quem,
    agora
  );
  agendarEmail(banco, "ENTREVISTA_AGENDADA", c, agora.toISOString(), agora);
  agendarLembretes(banco, c, agora);
}

export function registrarAvaliacao(
  banco: Banco,
  candidaturaId: string,
  dados: Omit<Avaliacao, "por" | "em">,
  quem: string,
  agora: Date
) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "avaliacao");
  // Na ordem da ficha: parte 1, notas, pontos observados, fechamento.
  const semResposta = DADOS_FICHA.filter((d) => d.obrigatoria && !dados.dados[d.chave]?.valor);
  if (semResposta.length > 0) {
    throw new ErroRegra(`Responda na parte 1: ${semResposta.map((d) => d.rotulo.replace("?", "")).join("; ")}.`);
  }
  const notas = CRITERIOS_ENTREVISTA.map((k) => dados.notas[k.chave]?.nota);
  if (notas.some((n) => n === undefined || !notaValida(n))) {
    throw new ErroRegra("Dê nota de 0 a 10 nos 7 critérios da ficha.");
  }
  const tres = (l: string[]) => l.length === 3 && l.every((p) => p.trim() !== "");
  if (!tres(dados.pontos_positivos) || !tres(dados.pontos_atencao)) {
    throw new ErroRegra("A ficha pede exatamente 3 pontos positivos e 3 de atenção, com exemplo da entrevista.");
  }
  if (dados.realizada_por.length === 0) throw new ErroRegra("Marque quem fez a entrevista.");
  if (!notaValida(dados.nota_entrevistador)) throw new ErroRegra("Informe a nota geral do entrevistador.");
  if (dados.nota_supervisora !== null && !notaValida(dados.nota_supervisora)) {
    throw new ErroRegra("A nota da supervisora vai de 0 a 10.");
  }
  if ((dados.nota_supervisora !== null) !== (dados.supervisora !== "")) {
    throw new ErroRegra("Supervisora e nota da supervisora vão juntas: preencha as duas ou nenhuma.");
  }
  c.avaliacao = { ...dados, por: quem, em: agora.toISOString() };
  // A entrevista passou: lembrete que ainda não saiu não faz mais sentido.
  cancelarPendentes(banco, c.id, "entrevista já realizada", ["LEMBRETE_ENTREVISTA", "LEMBRETE_ENTREVISTA_EQUIPE"]);
  mudarEtapa(
    banco,
    c,
    "ENTREVISTADO",
    `Entrevista realizada por ${dados.realizada_por.join(", ")}. Nota do entrevistador ${dados.nota_entrevistador}${
      dados.nota_supervisora !== null ? `, da supervisora (${dados.supervisora}) ${dados.nota_supervisora}` : ""
    }; parecer: ${dados.parecer.toLowerCase()}.`,
    quem,
    agora
  );
}

export function naoCompareceu(banco: Banco, candidaturaId: string, observacao: string, quem: string, agora: Date) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "nao_compareceu");
  cancelarPendentes(banco, c.id, "candidato não compareceu");
  c.motivo_encerramento = "Não compareceu à entrevista";
  mudarEtapa(
    banco,
    c,
    "DESISTIU",
    `Não compareceu à entrevista${observacao.trim() ? ` — ${observacao.trim()}` : ""}.`,
    quem,
    agora
  );
}

// ─── Decisão, confirmação e admissão ───────────────────────────────────────

export function decidir(
  banco: Banco,
  candidaturaId: string,
  dados: { resultado: "APROVADO" | "REPROVADO" | "RESERVA"; quem_decidiu: string; comentario: string; motivo: string },
  quem: string,
  agora: Date
) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "decisao");
  if (!dados.quem_decidiu.trim()) {
    throw new ErroRegra("Informe quem participou da decisão (regra 3: a gestão não aprova sozinha).");
  }
  if (dados.resultado !== "APROVADO" && !dados.motivo.trim()) {
    throw new ErroRegra("Informe o motivo — ele aparece nos indicadores.");
  }
  c.decisao = {
    resultado: dados.resultado,
    quem_decidiu: dados.quem_decidiu.trim(),
    comentario: dados.comentario.trim(),
    por: quem,
    em: agora.toISOString(),
  };
  const por = ` Decidido por ${dados.quem_decidiu.trim()}.`;
  if (dados.resultado === "APROVADO") {
    mudarEtapa(banco, c, "APROVADO", `Aprovado após a entrevista.${por}`, quem, agora);
    agendarEmail(banco, "APROVADO", c, agora.toISOString(), agora);
  } else if (dados.resultado === "RESERVA") {
    c.motivo_encerramento = dados.motivo.trim();
    mudarEtapa(banco, c, "RESERVA", `Guardado no banco de reserva — ${dados.motivo.trim()}.${por}`, quem, agora);
  } else {
    c.motivo_encerramento = dados.motivo.trim();
    mudarEtapa(banco, c, "REPROVADO", `Reprovado após a entrevista — ${dados.motivo.trim()}.${por}`, quem, agora);
    agendarNegativa(banco, "REPROVADO_ENTREVISTA", c, agora);
  }
}

export function confirmarInicio(banco: Banco, candidaturaId: string, dataInicio: string, quem: string, agora: Date) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "confirmacao");
  const erro = validarDataInicio(dataInicio, hoje(agora));
  if (erro) throw new ErroRegra(erro);
  c.data_inicio = dataInicio;
  c.confirmado_em = agora.toISOString();
  // Dia fora do padrão fica dito no histórico, para o RH ajustar a primeira semana.
  const avisos = avisosInicio(dataInicio);
  mudarEtapa(
    banco,
    c,
    "ADMISSAO",
    `Confirmou o início para ${dataInicio.split("-").reverse().join("/")}${
      avisos.length ? ` (atenção: ${avisos.join("; ")})` : ""
    }. Encaminhado ao RH para a admissão.`,
    quem,
    agora
  );
}

export function desistir(banco: Banco, candidaturaId: string, motivo: string, quem: string, agora: Date) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "desistiu");
  if (!motivo.trim()) throw new ErroRegra("Informe o motivo da desistência.");
  cancelarPendentes(banco, c.id, "candidato desistiu");
  c.motivo_encerramento = motivo.trim();
  mudarEtapa(banco, c, "DESISTIU", `Desistiu — ${motivo.trim()}.`, quem, agora);
}

/**
 * Volta uma candidatura encerrada para onde estava. Se a negativa ainda não
 * saiu, é cancelada — é para isso que ela espera 2 dias.
 */
export function desfazerEncerramento(banco: Banco, candidaturaId: string, quem: string, agora: Date) {
  const c = achar(banco, candidaturaId);
  exigirAcao(c, "desfazer");
  const volta = c.etapa_encerramento ?? "INSCRITO";
  const canceladas = cancelarPendentes(banco, c.id, "encerramento desfeito", [
    "REPROVADO_TRIAGEM",
    "REPROVADO_ENTREVISTA",
  ]);
  const jaSaiu = banco.emails.some(
    (e) =>
      e.candidatura_id === c.id &&
      e.situacao === "ENVIADO" &&
      (e.modelo === "REPROVADO_TRIAGEM" || e.modelo === "REPROVADO_ENTREVISTA")
  );
  // Voltar para "inscrito" ou "entrevistado" refaz a triagem ou a decisão.
  if (volta === "INSCRITO") c.triagem = null;
  if (volta === "ENTREVISTADO") c.decisao = null;
  mudarEtapa(
    banco,
    c,
    volta,
    `Encerramento desfeito: voltou para "${ETAPAS[volta].rotulo}".${
      canceladas ? " O e-mail de negativa foi cancelado antes de sair." : ""
    }${jaSaiu ? " Atenção: a negativa já tinha sido enviada ao candidato." : ""}`,
    quem,
    agora
  );
  if (volta === "ENTREVISTA_AGENDADA" && c.entrevista && c.entrevista.data_hora > agora.toISOString()) {
    agendarLembretes(banco, c, agora);
  }
}

// ─── Vagas ─────────────────────────────────────────────────────────────────

export type DadosVaga = Omit<
  Vaga,
  "id" | "slug" | "situacao" | "aberta_em" | "encerrada_em" | "criado_em" | "criado_por"
>;

export function salvarVaga(banco: Banco, vagaId: string | null, dados: DadosVaga, quem: string, agora: Date): Vaga {
  if (!dados.titulo.trim()) throw new ErroRegra("Informe o cargo.");
  const limpo = Object.fromEntries(
    Object.entries(dados).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
  ) as DadosVaga;

  if (vagaId) {
    const vaga = banco.vagas.find((v) => v.id === vagaId);
    if (!vaga) throw new ErroRegra("Vaga não encontrada.");
    if (vaga.situacao === "ABERTA" && faltaParaAbrir(limpo).length) {
      throw new ErroRegra(`Vaga aberta não pode ficar sem ${faltaParaAbrir(limpo).join(", ")}.`);
    }
    Object.assign(vaga, limpo);
    return vaga;
  }

  let slug = gerarSlug(limpo.titulo);
  let n = 2;
  while (banco.vagas.some((v) => v.slug === slug)) slug = `${gerarSlug(limpo.titulo)}-${n++}`;

  const vaga: Vaga = {
    ...limpo,
    id: id("vaga"),
    slug,
    situacao: "RASCUNHO",
    aberta_em: null,
    encerrada_em: null,
    criado_em: agora.toISOString(),
    criado_por: quem,
  };
  banco.vagas.push(vaga);
  return vaga;
}

export function mudarSituacaoVaga(
  banco: Banco,
  vagaId: string,
  para: Vaga["situacao"],
  abertaEm: string | null,
  agora: Date
) {
  const vaga = banco.vagas.find((v) => v.id === vagaId);
  if (!vaga) throw new ErroRegra("Vaga não encontrada.");
  if (para === "ABERTA") {
    const falta = faltaParaAbrir(vaga);
    if (falta.length) {
      throw new ErroRegra(`Regra 1 do processo: a vaga só abre com ${falta.join(", ")} definidos.`);
    }
    if (vaga.situacao === "RASCUNHO") vaga.aberta_em = abertaEm || hoje(agora);
    vaga.encerrada_em = null;
  }
  if (para === "ENCERRADA") vaga.encerrada_em = hoje(agora);
  vaga.situacao = para;
}

/** Quem já passou do prazo de guarda (LGPD) — só lê. */
export function candidatosVencidos(banco: Banco, agora: Date): Set<string> {
  const dia = hoje(agora);
  return new Set(
    banco.candidatos
      .filter((p) => {
        const ate = guardarAte(
          p.consentimento_em,
          banco.candidaturas.filter((c) => c.candidato_id === p.id),
          banco.config.meses_guarda
        );
        return ate !== null && ate < dia;
      })
      .map((p) => p.id)
  );
}

/**
 * LGPD: apaga quem passou do prazo de guarda (`config.meses_guarda`, decisão do
 * Nicolas em 29/10: "apaga sim"). Some a pessoa e tudo o que fala dela —
 * candidaturas, contatos, histórico e e-mails. Fica só a contagem, sem nome,
 * para mostrar que a limpeza rodou. Quem foi contratado não entra.
 *
 * O motor não mexe em disco: devolve os arquivos (currículo e fichas
 * escaneadas) para quem chamou apagar depois de gravar o banco.
 */
export function apagarVencidos(banco: Banco, agora: Date): Arquivo[] {
  const vencidos = candidatosVencidos(banco, agora);
  if (vencidos.size === 0) return [];

  const arquivos: Arquivo[] = [];
  for (const p of banco.candidatos) if (vencidos.has(p.id) && p.curriculo) arquivos.push(p.curriculo);
  for (const c of banco.candidaturas) if (vencidos.has(c.candidato_id) && c.avaliacao?.ficha) arquivos.push(c.avaliacao.ficha);

  const candidaturas = new Set(banco.candidaturas.filter((c) => vencidos.has(c.candidato_id)).map((c) => c.id));
  banco.candidatos = banco.candidatos.filter((p) => !vencidos.has(p.id));
  banco.candidaturas = banco.candidaturas.filter((c) => !candidaturas.has(c.id));
  banco.contatos = banco.contatos.filter((c) => !candidaturas.has(c.candidatura_id));
  banco.eventos = banco.eventos.filter((e) => !vencidos.has(e.candidato_id));
  banco.emails = banco.emails.filter((e) => !vencidos.has(e.candidato_id));
  banco.limpezas_lgpd = [...(banco.limpezas_lgpd ?? []), { em: agora.toISOString(), candidatos: vencidos.size }];
  return arquivos;
}
