/**
 * Regras do processo de contratação, sem banco e sem tela — só conta.
 *
 * Fonte: `03 - Processos/Contratação de novos colaboradores.md` no cofre (ciclo
 * de 12 dias, início sempre na segunda) e o documento "Novo processo de
 * contratação" (e-mails, prazos da negativa, lembrete). Conferidas pelo script
 * `npm run regras:conferir`.
 */

import { diaDaSemana, diasEntre, ehSegunda, juntarDiaHora, nomeDoDia, proximaSegunda, somarDias, diaDe } from "./datas.ts";
import { ehFeriado } from "./feriados.ts";
import type { Candidatura, Etapa, Vaga } from "./tipos.ts";

// ─── Ciclo de 12 dias ──────────────────────────────────────────────────────

export type FaseCiclo = {
  chave: string;
  rotulo: string;
  responsavel: string;
  /** Dia do ciclo (1 = dia da abertura). */
  diaInicio: number;
  diaFim: number;
  inicio: string;
  fim: string;
  /** Etapas cujos candidatos ainda "pertencem" a esta fase — atrasados se o prazo passou. */
  etapasPendentes: Etapa[];
};

const FASES: Omit<FaseCiclo, "inicio" | "fim">[] = [
  {
    chave: "abertura",
    rotulo: "Decisão e divulgação da vaga",
    responsavel: "Leonardo, Rogerio e Luana · Nicolas divulga",
    diaInicio: 1,
    diaFim: 1,
    etapasPendentes: [],
  },
  {
    chave: "triagem",
    rotulo: "Triagem de currículos e agendamento",
    responsavel: "Letícia Garcia",
    diaInicio: 2,
    diaFim: 4,
    etapasPendentes: ["INSCRITO", "TRIAGEM_APROVADA"],
  },
  {
    chave: "entrevistas",
    rotulo: "Entrevistas e decisão dos aprovados",
    responsavel: "Leonardo, Rogerio, Luana + supervisora",
    diaInicio: 5,
    diaFim: 9,
    etapasPendentes: ["ENTREVISTA_AGENDADA", "ENTREVISTADO"],
  },
  {
    chave: "retornos",
    rotulo: "Retornos aos candidatos",
    responsavel: "Letícia Garcia",
    diaInicio: 10,
    diaFim: 12,
    etapasPendentes: ["APROVADO"],
  },
  {
    chave: "inicio",
    rotulo: "Início do colaborador",
    responsavel: "Marco Aurelio — Diretoria de RH",
    diaInicio: 15,
    diaFim: 15,
    etapasPendentes: [],
  },
];

export function fasesDoCiclo(abertaEm: string): FaseCiclo[] {
  return FASES.map((f) => ({
    ...f,
    inicio: somarDias(abertaEm, f.diaInicio - 1),
    fim: somarDias(abertaEm, f.diaFim - 1),
  }));
}

/** Em que dia do ciclo estamos (1 a 15+), ou `null` se a vaga não abriu. */
export function diaDoCiclo(abertaEm: string | null, referencia: string): number | null {
  if (!abertaEm) return null;
  return diasEntre(abertaEm, referencia) + 1;
}

/** A fase em andamento hoje; entre fases (fim de semana do dia 13-14), a última que passou. */
export function faseAtual(abertaEm: string, referencia: string): FaseCiclo | null {
  const fases = fasesDoCiclo(abertaEm);
  const dia = diasEntre(abertaEm, referencia) + 1;
  if (dia < 1) return null;
  let atual: FaseCiclo | null = null;
  for (const f of fases) if (dia >= f.diaInicio) atual = f;
  return atual;
}

/**
 * Candidaturas paradas numa fase cujo prazo já passou. É o que faz "o início
 * escorregar para a outra segunda" — por isso aparece em vermelho na vaga.
 */
export function atrasadas(
  abertaEm: string,
  referencia: string,
  candidaturas: Candidatura[]
): { fase: FaseCiclo; quantidade: number }[] {
  return fasesDoCiclo(abertaEm)
    .filter((f) => f.etapasPendentes.length && referencia > f.fim)
    .map((f) => ({
      fase: f,
      quantidade: candidaturas.filter((c) => f.etapasPendentes.includes(c.etapa)).length,
    }))
    .filter((x) => x.quantidade > 0);
}

// ─── Vaga ──────────────────────────────────────────────────────────────────

/**
 * Regra 1 do processo: nenhuma vaga é divulgada antes de cargo, salário,
 * benefícios, horário e atribuições estarem definidos.
 */
export function faltaParaAbrir(vaga: Pick<Vaga, "titulo" | "salario" | "beneficios" | "horario" | "atribuicoes" | "quantidade">): string[] {
  const falta: string[] = [];
  if (!vaga.titulo.trim()) falta.push("cargo");
  if (!(vaga.quantidade > 0)) falta.push("número de vagas");
  if (!vaga.salario.trim()) falta.push("salário");
  if (!vaga.beneficios.trim()) falta.push("benefícios");
  if (!vaga.horario.trim()) falta.push("horário");
  if (!vaga.atribuicoes.trim()) falta.push("atribuições");
  return falta;
}

/** Texto do aviso quando a vaga abre fora da segunda-feira. */
export function avisoAbertura(abertaEm: string): string | null {
  if (ehSegunda(abertaEm)) return null;
  return "O ciclo foi pensado para começar numa segunda-feira. Aberta em outro dia, as entrevistas e o início saem do desenho original — confira as datas abaixo.";
}

/** Gera o endereço curto da vaga a partir do título: "Operador(a) de telemarketing" → "operador-a-de-telemarketing". */
export function gerarSlug(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ─── Notas ─────────────────────────────────────────────────────────────────

/** Média com uma casa. Nota fora de 0–10 é recusada antes de chegar aqui. */
export function media(notas: number[]): number {
  if (!notas.length) return 0;
  return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
}

export function notaValida(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 10;
}

// ─── Quando mandar cada e-mail ─────────────────────────────────────────────

/**
 * Negativa: N dias depois da reprovação, às 9h. A espera é de propósito — dá
 * tempo de desfazer um engano antes de o candidato receber o "não".
 */
export function quandoEnviarNegativa(agora: Date, dias: number): string {
  return juntarDiaHora(somarDias(diaDe(agora.toISOString()), dias), "09:00");
}

/**
 * Lembrete: na véspera da entrevista, no horário configurado. Se a entrevista
 * foi marcada tão em cima que a véspera já passou, vai na hora.
 */
export function quandoEnviarLembrete(dataHoraEntrevista: string, horaLembrete: string, agora: Date): string {
  const vespera = somarDias(diaDe(dataHoraEntrevista), -1);
  const alvo = juntarDiaHora(vespera, horaLembrete);
  return alvo > agora.toISOString() ? alvo : agora.toISOString();
}

// ─── Admissão ──────────────────────────────────────────────────────────────

/**
 * Regra 6: o início é numa segunda-feira — mas o dia pode mudar (decisão do
 * Nicolas, 29/10). Só bloqueia o que não tem jeito: data passada e fim de
 * semana. Outro dia útil passa, com aviso (`avisosInicio`).
 */
export function validarDataInicio(dia: string, referencia: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return "Informe a data de início.";
  if (dia < referencia) return "A data de início já passou.";
  if (diaDaSemana(dia) === 0 || diaDaSemana(dia) === 6) return "O início é num dia útil, não no fim de semana.";
  return null;
}

/** O que vale avisar sobre o dia escolhido (não bloqueia). */
export function avisosInicio(dia: string): string[] {
  const avisos: string[] = [];
  if (!ehSegunda(dia)) {
    avisos.push(`início numa ${nomeDoDia(dia)}, fora da segunda — ajustar a primeira semana (treinamento, linha, banco e exame)`);
  }
  const feriado = avisoFeriado(dia);
  if (feriado) avisos.push(feriado);
  return avisos;
}

/**
 * A sugestão de início: a próxima segunda; se ela for feriado, o dia útil
 * seguinte (Finados numa segunda → começa na terça, sem perder a semana).
 */
export function sugestaoInicio(referencia: string): string {
  let dia = proximaSegunda(referencia);
  while (ehFeriado(dia) || diaDaSemana(dia) === 0 || diaDaSemana(dia) === 6) dia = somarDias(dia, 1);
  return dia;
}

/** Aviso (não bloqueia): a segunda escolhida é feriado. */
export function avisoFeriado(dia: string): string | null {
  return ehFeriado(dia) ? `${dia.split("-").reverse().join("/")} é feriado nacional.` : null;
}

// ─── Guarda dos dados (LGPD) ───────────────────────────────────────────────

/**
 * Até que dia o currículo (e as fichas) de alguém podem ficar no banco:
 * `meses` depois do último movimento — o aceite ou qualquer candidatura.
 * Quem foi contratado (chegou à admissão) devolve `null`: os dados passam a
 * ser do RH, com outra regra de guarda.
 */
export function guardarAte(
  consentimentoEm: string | null,
  candidaturas: Pick<Candidatura, "etapa" | "atualizado_em">[],
  meses: number
): string | null {
  if (candidaturas.some((c) => c.etapa === "ADMISSAO")) return null;
  const ultimo = [consentimentoEm ?? "", ...candidaturas.map((c) => c.atualizado_em)].sort().at(-1);
  if (!ultimo) return null;
  const [a, m, d] = diaDe(ultimo).split("-").map(Number);
  // Date.UTC acerta a virada de ano; 31/jan + 1 mês cai em 03/mar — uns dias a mais, nunca a menos.
  return new Date(Date.UTC(a, m - 1 + meses, d)).toISOString().slice(0, 10);
}

// ─── O que dá para fazer em cada etapa ─────────────────────────────────────

export type Acao =
  | "triagem"
  | "contato"
  | "remarcar"
  | "nao_compareceu"
  | "avaliacao"
  | "decisao"
  | "confirmacao"
  | "desfazer"
  | "desistiu";

export function acoesDaEtapa(etapa: Etapa): Acao[] {
  switch (etapa) {
    case "INSCRITO":
      return ["triagem", "desistiu"];
    case "TRIAGEM_APROVADA":
      return ["contato", "desistiu"];
    case "ENTREVISTA_AGENDADA":
      return ["avaliacao", "remarcar", "nao_compareceu", "desistiu"];
    case "ENTREVISTADO":
      return ["decisao", "desistiu"];
    case "APROVADO":
      return ["confirmacao", "desistiu"];
    case "ADMISSAO":
      return [];
    case "REPROVADO":
    case "DESISTIU":
    case "RESERVA":
      return ["desfazer"];
  }
}
