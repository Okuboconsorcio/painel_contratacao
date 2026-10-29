/**
 * Leituras prontas para as telas: junta candidatura + candidato + vaga, conta
 * pendências e calcula os indicadores. Só lê — nunca altera o banco.
 *
 * No Polaris, as contas de pendência viram parte de `pendencias_do_usuario`
 * (a bolinha do menu) e os indicadores, uma função do banco — a bolinha tem
 * de ser cópia fiel da conta da tela.
 */

import { diaDe, diasEntre, hoje } from "./datas.ts";
import { ETAPAS, FUNIL } from "./opcoes.ts";
import type { Banco, Candidato, Candidatura, Etapa, Evento, Vaga } from "./tipos.ts";

export type Linha = { candidatura: Candidatura; candidato: Candidato; vaga: Vaga };

export function linhas(banco: Banco): Linha[] {
  const cand = new Map(banco.candidatos.map((c) => [c.id, c]));
  const vagas = new Map(banco.vagas.map((v) => [v.id, v]));
  return banco.candidaturas
    .map((c) => ({ candidatura: c, candidato: cand.get(c.candidato_id)!, vaga: vagas.get(c.vaga_id)! }))
    .filter((l) => l.candidato && l.vaga);
}

/** Dias parado na etapa atual — a última mudança de etapa registrada no histórico. */
export function diasNaEtapa(banco: Banco, c: Candidatura, referencia = hoje()): number {
  const ultima = banco.eventos
    .filter((e) => e.candidatura_id === c.id && (e.tipo === "ETAPA" || e.tipo === "INSCRICAO"))
    .at(-1);
  return diasEntre(diaDe(ultima?.em ?? c.criado_em), referencia);
}

export type Pendencias = {
  triagem: number;
  contato: number;
  entrevistasHoje: number;
  entrevistasPassadas: number;
  decisao: number;
  confirmacao: number;
  total: number;
};

export function pendencias(banco: Banco, agora = new Date()): Pendencias {
  const dia = hoje(agora);
  const iso = agora.toISOString();
  const ativas = banco.candidaturas.filter((c) => {
    const v = banco.vagas.find((x) => x.id === c.vaga_id);
    return v && v.situacao !== "ENCERRADA";
  });
  const conta = (e: Etapa) => ativas.filter((c) => c.etapa === e).length;
  const agendadas = ativas.filter((c) => c.etapa === "ENTREVISTA_AGENDADA" && c.entrevista);
  const p = {
    triagem: conta("INSCRITO"),
    contato: conta("TRIAGEM_APROVADA"),
    entrevistasHoje: agendadas.filter((c) => diaDe(c.entrevista!.data_hora) === dia).length,
    entrevistasPassadas: agendadas.filter((c) => c.entrevista!.data_hora < iso).length,
    decisao: conta("ENTREVISTADO"),
    confirmacao: conta("APROVADO"),
  };
  return { ...p, total: p.triagem + p.contato + p.entrevistasPassadas + p.decisao + p.confirmacao };
}

export function historico(banco: Banco, filtro: { candidatura?: string; candidato?: string }): Evento[] {
  return banco.eventos
    .filter((e) =>
      filtro.candidatura ? e.candidatura_id === filtro.candidatura : e.candidato_id === filtro.candidato
    )
    .sort((a, b) => b.em.localeCompare(a.em));
}

// ─── Indicadores ───────────────────────────────────────────────────────────

/** Até onde a candidatura chegou no funil (encerradas contam até onde estavam). */
function alcance(c: Candidatura): number {
  const etapa = ETAPAS[c.etapa].encerrada ? c.etapa_encerramento ?? "INSCRITO" : c.etapa;
  return FUNIL.indexOf(etapa);
}

function mediaDias(valores: number[]) {
  return valores.length ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10 : null;
}

export function indicadores(banco: Banco, vagaId?: string) {
  const cs = banco.candidaturas.filter((c) => !vagaId || c.vaga_id === vagaId);
  const cand = new Map(banco.candidatos.map((c) => [c.id, c]));

  // Funil: quantos chegaram a cada etapa.
  const funil = FUNIL.map((etapa, i) => ({
    etapa,
    rotulo: ETAPAS[etapa].rotulo,
    quantidade: cs.filter((c) => alcance(c) >= i).length,
  }));

  // Origem: de onde vem quem se inscreve e de onde vem quem é aprovado.
  const origens = new Map<string, { inscritos: number; aprovados: number }>();
  for (const c of cs) {
    const o = cand.get(c.candidato_id)?.origem || "Outro";
    const atual = origens.get(o) ?? { inscritos: 0, aprovados: 0 };
    atual.inscritos++;
    if (alcance(c) >= FUNIL.indexOf("APROVADO")) atual.aprovados++;
    origens.set(o, atual);
  }

  // Por que saíram.
  const motivos = new Map<string, number>();
  for (const c of cs.filter((x) => ETAPAS[x.etapa].encerrada)) {
    const chave = `${ETAPAS[c.etapa].rotulo}: ${c.motivo_encerramento || "sem motivo"}`;
    motivos.set(chave, (motivos.get(chave) ?? 0) + 1);
  }

  // Tempo entre os marcos, em dias.
  const momentoDe = (c: Candidatura, para: Etapa) =>
    banco.eventos.find((e) => e.candidatura_id === c.id && e.para === para)?.em ?? null;
  const intervalos = (de: Etapa, para: Etapa) =>
    cs
      .map((c) => {
        const a = momentoDe(c, de);
        const b = momentoDe(c, para);
        return a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000 : null;
      })
      .filter((x): x is number => x !== null);

  const tempos = [
    { rotulo: "Inscrição → triagem", dias: mediaDias(intervalos("INSCRITO", "TRIAGEM_APROVADA")) },
    { rotulo: "Triagem → entrevista marcada", dias: mediaDias(intervalos("TRIAGEM_APROVADA", "ENTREVISTA_AGENDADA")) },
    { rotulo: "Entrevista marcada → realizada", dias: mediaDias(intervalos("ENTREVISTA_AGENDADA", "ENTREVISTADO")) },
    { rotulo: "Entrevista → decisão", dias: mediaDias(intervalos("ENTREVISTADO", "APROVADO")) },
    { rotulo: "Aprovação → confirmação do início", dias: mediaDias(intervalos("APROVADO", "ADMISSAO")) },
  ];

  // Comparecimento: das entrevistas marcadas que já passaram, quantas aconteceram.
  const agora = new Date().toISOString();
  const marcadas = cs.filter((c) => c.entrevista && c.entrevista.data_hora < agora);
  const compareceram = marcadas.filter((c) => c.avaliacao).length;
  const faltaram = marcadas.filter((c) => c.motivo_encerramento === "Não compareceu à entrevista").length;

  const notas = cs.filter((c) => c.triagem).map((c) => c.triagem!.nota_geral);

  return {
    total: cs.length,
    emAndamento: cs.filter((c) => !ETAPAS[c.etapa].encerrada && c.etapa !== "ADMISSAO").length,
    admitidos: cs.filter((c) => c.etapa === "ADMISSAO").length,
    reprovados: cs.filter((c) => c.etapa === "REPROVADO").length,
    desistentes: cs.filter((c) => c.etapa === "DESISTIU").length,
    reserva: cs.filter((c) => c.etapa === "RESERVA").length,
    conversao: cs.length ? cs.filter((c) => c.etapa === "ADMISSAO").length / cs.length : 0,
    funil,
    origens: [...origens.entries()]
      .map(([origem, v]) => ({ origem, ...v }))
      .sort((a, b) => b.inscritos - a.inscritos),
    motivos: [...motivos.entries()].map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n),
    tempos,
    comparecimento: { marcadas: marcadas.length, compareceram, faltaram },
    notaMediaTriagem: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null,
  };
}
