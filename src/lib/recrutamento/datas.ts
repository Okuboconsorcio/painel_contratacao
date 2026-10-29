/**
 * Datas no fuso de São Paulo, sem biblioteca.
 *
 * Dia é guardado como texto `AAAA-MM-DD` e calculado ao meio-dia local — assim
 * somar dias nunca escorrega para o dia anterior por causa de fuso ou horário
 * de verão. Momento (inscrição, entrevista) é ISO completo.
 */

const FUSO = "America/Sao_Paulo";

/** Hoje em São Paulo, como `AAAA-MM-DD`. */
export function hoje(agora: Date = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: FUSO });
}

function paraData(dia: string): Date {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12));
}

function paraTexto(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number): string {
  const d = paraData(dia);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraTexto(d);
}

/** 0 = domingo, 1 = segunda … 6 = sábado. */
export function diaDaSemana(dia: string): number {
  return paraData(dia).getUTCDay();
}

export function ehSegunda(dia: string): boolean {
  return diaDaSemana(dia) === 1;
}

/** A segunda-feira seguinte (ou o próprio dia, se já for segunda e `incluir`). */
export function proximaSegunda(dia: string, incluir = false): string {
  const falta = (8 - diaDaSemana(dia)) % 7;
  if (falta === 0) return incluir ? dia : somarDias(dia, 7);
  return somarDias(dia, falta);
}

/** Dias corridos de `de` até `ate` (positivo se `ate` é depois). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86_400_000);
}

const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function nomeDoDia(dia: string): string {
  return NOMES_DIA[diaDaSemana(dia)];
}

/** "27/10" */
export function diaCurto(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}

/** "27/10/2026" */
export function diaLongo(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

/** O dia (AAAA-MM-DD) de um momento ISO, em São Paulo. */
export function diaDe(momento: string): string {
  return hoje(new Date(momento));
}

/** "29/10/2026 às 14:30" */
export function momento(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: FUSO });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dia} às ${hora}`;
}

/** "14:30" */
export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Junta dia e hora digitados na tela (horário de São Paulo) num momento ISO.
 * Brasil não tem horário de verão desde 2019: São Paulo é sempre -03:00.
 */
export function juntarDiaHora(dia: string, horaMinuto: string): string {
  return new Date(`${dia}T${horaMinuto}:00-03:00`).toISOString();
}

/** O contrário de `juntarDiaHora`, para preencher o formulário de remarcar. */
export function separarDiaHora(iso: string): { dia: string; hora: string } {
  return { dia: diaDe(iso), hora: hora(iso) };
}

/** "há 3 dias", "hoje", "amanhã", "em 2 dias" — para listas. */
export function relativo(dia: string, referencia: string = hoje()): string {
  const n = diasEntre(referencia, dia);
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  if (n === -1) return "ontem";
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}
