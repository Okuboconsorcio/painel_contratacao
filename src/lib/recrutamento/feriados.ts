/**
 * Feriados nacionais — **cópia** de `feriadosNacionais` em `src/lib/ciclos.ts`
 * do Polaris. Na integração, apagar este arquivo e importar de lá: a lista de
 * feriados já existe em dois lugares no Polaris (código e banco), não pode
 * virar três.
 *
 * Serve aqui para avisar quando a segunda-feira de início cai em feriado (o
 * 02/11, Finados, por exemplo). O sistema avisa e sugere a segunda seguinte;
 * não decide sozinho se o início passa para a terça.
 */

function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const isoDe = (data: Date) => data.toISOString().slice(0, 10);
const mais = (data: Date, dias: number) => {
  const nova = new Date(data);
  nova.setUTCDate(nova.getUTCDate() + dias);
  return nova;
};

const cache = new Map<number, Set<string>>();

export function feriadosNacionais(ano: number): Set<string> {
  const guardado = cache.get(ano);
  if (guardado) return guardado;
  const pascoa = domingoDePascoa(ano);
  const feriados = new Set<string>([
    `${ano}-01-01`,
    `${ano}-04-21`,
    `${ano}-05-01`,
    `${ano}-09-07`,
    `${ano}-10-12`,
    `${ano}-11-02`,
    `${ano}-11-15`,
    `${ano}-11-20`,
    `${ano}-12-25`,
    isoDe(mais(pascoa, -48)),
    isoDe(mais(pascoa, -47)),
    isoDe(mais(pascoa, -2)),
    isoDe(mais(pascoa, 60)),
  ]);
  cache.set(ano, feriados);
  return feriados;
}

export function ehFeriado(dia: string): boolean {
  return feriadosNacionais(Number(dia.slice(0, 4))).has(dia);
}
