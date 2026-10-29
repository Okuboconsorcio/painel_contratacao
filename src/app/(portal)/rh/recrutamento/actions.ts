"use server";

/**
 * Ações das telas do recrutamento. Cada uma: confere a permissão, chama o motor
 * do processo dentro de uma transação e devolve "deu certo" ou o motivo.
 *
 * A permissão é conferida **aqui**, no servidor, e não só escondendo o botão:
 * botão escondido não impede ninguém de chamar a ação direto.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { juntarDiaHora } from "@/lib/recrutamento/datas";
import { lerBanco, salvarArquivo, transacao } from "@/lib/recrutamento/dados";
import { enviarPendentes } from "@/lib/recrutamento/envio";
import { CRITERIOS_ENTREVISTA, CRITERIOS_TRIAGEM, DADOS_FICHA, MODELOS_EMAIL } from "@/lib/recrutamento/opcoes";
import type { AcaoPermissao, Modulo, Papel } from "@/lib/recrutamento/permissoes";
import { PAPEIS } from "@/lib/recrutamento/permissoes";
import {
  confirmarInicio,
  decidir,
  desfazerEncerramento,
  desistir,
  editarCandidato,
  ErroRegra,
  inscrever,
  mudarSituacaoVaga,
  naoCompareceu,
  registrarAvaliacao,
  registrarContato,
  registrarTriagem,
  remarcarEntrevista,
  salvarVaga,
  type DadosCandidato,
  type DadosEntrevista,
} from "@/lib/recrutamento/processo";
import { obterSessao, type Sessao } from "@/lib/recrutamento/sessao";
import type { CanalContato, Empresa, ModeloEmail, ResultadoContato, Resultado, SituacaoVaga } from "@/lib/recrutamento/tipos";

const BASE = "/rh/recrutamento";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = txt(f, k).replace(",", ".");
  return v === "" ? NaN : Number(v);
};
const arquivo = (f: FormData, k: string) => {
  const v = f.get(k);
  return v instanceof File && v.size > 0 ? v : null;
};

async function executar(
  modulo: Modulo,
  acao: AcaoPermissao,
  fn: (sessao: Sessao, agora: Date) => void | Promise<void>,
  mensagem?: string
): Promise<Resultado> {
  const sessao = await obterSessao();
  if (!sessao.pode(modulo, acao)) {
    return { ok: false, erro: "Seu tipo de login não pode fazer isso." };
  }
  try {
    await fn(sessao, new Date());
  } catch (e) {
    if (e instanceof ErroRegra) return { ok: false, erro: e.message };
    console.error(e);
    return { ok: false, erro: "Não foi possível salvar. Nada foi alterado — tente de novo." };
  }
  revalidatePath(BASE, "layout");
  return { ok: true, mensagem };
}

function dadosCandidato(f: FormData): DadosCandidato {
  return {
    nome: txt(f, "nome"),
    email: txt(f, "email"),
    telefone: txt(f, "telefone"),
    cidade: txt(f, "cidade"),
    bairro: txt(f, "bairro"),
    origem: txt(f, "origem"),
    resumo: txt(f, "resumo"),
    observacoes: txt(f, "observacoes"),
    data_nascimento: txt(f, "data_nascimento") || null,
    consentimento: f.get("consentimento") === "sim",
  };
}

function dadosEntrevista(f: FormData): DadosEntrevista | null {
  const dia = txt(f, "dia");
  const hora = txt(f, "hora");
  if (!dia || !hora) return null;
  return {
    data_hora: juntarDiaHora(dia, hora),
    local: txt(f, "local"),
    entrevistadores: txt(f, "entrevistadores"),
    supervisora: txt(f, "supervisora"),
  };
}

// ─── Vagas ─────────────────────────────────────────────────────────────────

export async function salvarVagaAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  const vagaId = txt(f, "vaga_id") || null;
  let novoId = "";
  const r = await executar("recrutamento", vagaId ? "editar" : "criar", async (s, agora) => {
    const vaga = await transacao((b) =>
      salvarVaga(
        b,
        vagaId,
        {
          titulo: txt(f, "titulo"),
          empresa: (txt(f, "empresa") || "MGCON") as Empresa,
          quantidade: Math.max(0, Math.trunc(num(f, "quantidade") || 0)),
          salario: txt(f, "salario"),
          remuneracao: txt(f, "remuneracao"),
          beneficios: txt(f, "beneficios"),
          horario: txt(f, "horario"),
          atribuicoes: txt(f, "atribuicoes"),
          requisitos: txt(f, "requisitos"),
          diferenciais: txt(f, "diferenciais"),
          local: txt(f, "local"),
          responsavel_nome: txt(f, "responsavel_nome"),
          responsavel_email: txt(f, "responsavel_email"),
        },
        s.nome,
        agora
      )
    );
    novoId = vaga.id;
  }, "Vaga salva.");
  if (r.ok) redirect(`${BASE}/vagas/${novoId}`);
  return r;
}

export async function situacaoVagaAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  const para = txt(f, "para") as SituacaoVaga;
  return executar(
    "recrutamento",
    "editar",
    async (_s, agora) =>
      await transacao((b) => mudarSituacaoVaga(b, txt(f, "vaga_id"), para, txt(f, "aberta_em") || null, agora)),
    para === "ABERTA" ? "Vaga aberta." : "Situação da vaga atualizada."
  );
}

// ─── Candidatos ────────────────────────────────────────────────────────────

export async function novoCandidatoAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  let destino = "";
  const r = await executar("recrutamento", "criar", async (s, agora) => {
    const curriculo = await salvarArquivo(arquivo(f, "curriculo"));
    const { candidatura } = await transacao((b) =>
      inscrever(b, dadosCandidato(f), txt(f, "vaga_id"), curriculo, s.nome, agora)
    );
    destino = `${BASE}/candidaturas/${candidatura.id}`;
  });
  if (r.ok) redirect(destino);
  return r;
}

export async function editarCandidatoAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar(
    "recrutamento",
    "editar",
    async (s, agora) => {
      const curriculo = await salvarArquivo(arquivo(f, "curriculo"));
      await transacao((b) => editarCandidato(b, txt(f, "candidato_id"), dadosCandidato(f), curriculo, s.nome, agora));
    },
    "Ficha salva."
  );
}

/** Reaproveita alguém do banco de currículos numa vaga nova. */
export async function inscreverEmVagaAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  let destino = "";
  const r = await executar("recrutamento", "criar", async (s, agora) => {
    const { candidatura } = await transacao((b) => {
      const c = b.candidatos.find((x) => x.id === txt(f, "candidato_id"));
      if (!c) throw new ErroRegra("Candidato não encontrado.");
      return inscrever(
        b,
        { ...c, consentimento: !!c.consentimento_em },
        txt(f, "vaga_id"),
        null,
        s.nome,
        agora
      );
    });
    destino = `${BASE}/candidaturas/${candidatura.id}`;
  });
  if (r.ok) redirect(destino);
  return r;
}

// ─── Etapas da candidatura ─────────────────────────────────────────────────

export async function triagemAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar(
    "recrutamento",
    "editar",
    async (s, agora) =>
      await transacao((b) =>
        registrarTriagem(
          b,
          txt(f, "candidatura_id"),
          {
            notas: Object.fromEntries(CRITERIOS_TRIAGEM.map((k) => [k.chave, num(f, `nota_${k.chave}`)])),
            comentario: txt(f, "comentario"),
            decisao: txt(f, "decisao") as "APROVADO" | "REPROVADO" | "RESERVA",
            motivo: txt(f, "motivo"),
          },
          s.nome,
          agora
        )
      ),
    "Triagem registrada."
  );
}

export async function contatoAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar(
    "recrutamento",
    "editar",
    async (s, agora) =>
      await transacao((b) =>
        registrarContato(
          b,
          txt(f, "candidatura_id"),
          {
            canal: txt(f, "canal") as CanalContato,
            resultado: txt(f, "resultado") as ResultadoContato,
            observacao: txt(f, "observacao"),
            entrevista: dadosEntrevista(f),
          },
          s.nome,
          agora
        )
      ),
    "Contato registrado."
  );
}

export async function remarcarAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar(
    "recrutamento",
    "editar",
    async (s, agora) => {
      const e = dadosEntrevista(f);
      if (!e) throw new ErroRegra("Informe o novo dia e hora.");
      await transacao((b) => remarcarEntrevista(b, txt(f, "candidatura_id"), { ...e, motivo: txt(f, "motivo") }, s.nome, agora));
    },
    "Entrevista remarcada. O candidato recebe o novo horário por e-mail."
  );
}

export async function naoCompareceuAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar("recrutamento", "editar", async (s, agora) =>
    await transacao((b) => naoCompareceu(b, txt(f, "candidatura_id"), txt(f, "observacao"), s.nome, agora))
  );
}

export async function avaliacaoAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar(
    "recrutamento",
    "editar",
    async (s, agora) => {
      const ficha = await salvarArquivo(arquivo(f, "ficha"));
      const sup = num(f, "nota_supervisora");
      const tres = (prefixo: string) => [1, 2, 3].map((i) => txt(f, `${prefixo}_${i}`));
      // "Outro, quem?" do papel: entra na lista junto com os marcados.
      const realizadaPor = [...f.getAll("realizada_por").map(String), txt(f, "realizada_outro")].filter(Boolean);
      const supervisora = txt(f, "supervisora") === "OUTRA" ? txt(f, "supervisora_outra") : txt(f, "supervisora");
      await transacao((b) =>
        registrarAvaliacao(
          b,
          txt(f, "candidatura_id"),
          {
            dados: Object.fromEntries(
              DADOS_FICHA.map((d) => [d.chave, { valor: txt(f, `dado_${d.chave}`), detalhe: txt(f, `dado_${d.chave}_detalhe`) }])
            ),
            notas: Object.fromEntries(
              CRITERIOS_ENTREVISTA.map((k) => [
                k.chave,
                { nota: num(f, `nota_${k.chave}`), justificativa: txt(f, `just_${k.chave}`) },
              ])
            ),
            pontos_positivos: tres("positivo"),
            pontos_atencao: tres("atencao"),
            realizada_por: realizadaPor,
            supervisora,
            nota_entrevistador: num(f, "nota_entrevistador"),
            nota_supervisora: Number.isNaN(sup) ? null : sup,
            parecer: txt(f, "parecer") as "APROVADO" | "REPROVADO" | "RESERVA",
            ficha,
          },
          s.nome,
          agora
        )
      );
    },
    "Entrevista registrada. Agora falta a decisão da gestão."
  );
}

export async function decisaoAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar("recrutamento_decidir", "criar", async (s, agora) =>
    await transacao((b) =>
      decidir(
        b,
        txt(f, "candidatura_id"),
        {
          resultado: txt(f, "resultado") as "APROVADO" | "REPROVADO" | "RESERVA",
          quem_decidiu: txt(f, "quem_decidiu"),
          comentario: txt(f, "comentario"),
          motivo: txt(f, "motivo"),
        },
        s.nome,
        agora
      )
    ),
    "Decisão registrada."
  );
}

export async function confirmacaoAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar(
    "recrutamento",
    "editar",
    async (s, agora) => await transacao((b) => confirmarInicio(b, txt(f, "candidatura_id"), txt(f, "data_inicio"), s.nome, agora)),
    "Início confirmado e encaminhado ao RH."
  );
}

export async function desistenciaAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar("recrutamento", "editar", async (s, agora) =>
    await transacao((b) => desistir(b, txt(f, "candidatura_id"), txt(f, "motivo"), s.nome, agora))
  );
}

export async function desfazerAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  const id = txt(f, "candidatura_id");
  // Desfazer uma decisão pós-entrevista é desfazer uma decisão da gestão.
  const c = (await lerBanco()).candidaturas.find((x) => x.id === id);
  const modulo: Modulo = c?.etapa_encerramento === "ENTREVISTADO" ? "recrutamento_decidir" : "recrutamento";
  return executar(
    modulo,
    "editar",
    async (s, agora) => await transacao((b) => desfazerEncerramento(b, id, s.nome, agora)),
    "Encerramento desfeito."
  );
}

// ─── E-mails e configuração ────────────────────────────────────────────────

export async function processarFilaAcao(_: Resultado | null, _f: FormData): Promise<Resultado> {
  let n = 0;
  const r = await executar("recrutamento", "ver", async (_s, agora) => {
    n = await enviarPendentes(agora);
  });
  const simulado = (await obterSessao()).real ? "" : " (simulação)";
  return r.ok ? { ok: true, mensagem: n ? `${n} e-mail(s) enviados${simulado}.` : "Nada na hora de sair." } : r;
}

export async function configAcao(_: Resultado | null, f: FormData): Promise<Resultado> {
  return executar(
    "recrutamento_config",
    "editar",
    async () => {
      const dias = Math.trunc(num(f, "dias_espera_negativa"));
      if (!(dias >= 0 && dias <= 10)) throw new ErroRegra("Espera da negativa: de 0 a 10 dias.");
      const hora = txt(f, "hora_lembrete");
      if (!/^\d{2}:\d{2}$/.test(hora)) throw new ErroRegra("Hora do lembrete no formato 09:00.");
      const masters = txt(f, "emails_master")
        .split(/[\s,;]+/)
        .filter(Boolean);
      if (masters.some((m) => !m.includes("@"))) throw new ErroRegra("Há um e-mail de master inválido.");
      const meses = Math.trunc(num(f, "meses_guarda"));
      if (!(meses >= 1 && meses <= 60)) throw new ErroRegra("Prazo de guarda dos currículos: de 1 a 60 meses.");
      const ligados = f.getAll("emails_ligados").map(String).filter((m): m is ModeloEmail => m in MODELOS_EMAIL);
      await transacao((b) => {
        b.config = {
          remetente: txt(f, "remetente"),
          emails_master: masters,
          dias_espera_negativa: dias,
          hora_lembrete: hora,
          endereco_entrevista: txt(f, "endereco_entrevista"),
          emails_ligados: ligados,
          meses_guarda: meses,
        };
      });
    },
    "Configuração salva. Vale para os próximos e-mails agendados."
  );
}

// ─── Simulação de login ────────────────────────────────────────────────────

export async function trocarPapelAcao(f: FormData) {
  const papel = txt(f, "papel") as Papel;
  if (!(papel in PAPEIS)) return;
  (await cookies()).set("papel", papel, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}
