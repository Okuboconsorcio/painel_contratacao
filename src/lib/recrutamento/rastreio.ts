/**
 * De qual anúncio veio cada candidato: UTMs e fbclid que a página de vagas
 * (site da MGCON) lê da URL e manda junto com a inscrição.
 *
 * O clique de prévia do Gerenciador de Anúncios chega com o texto literal
 * "{{campaign.name}}" — isso vira vazio, para não parecer uma campanha.
 */

import type { Rastreio } from "./tipos.ts";

export const CAMPOS_RASTREIO = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"] as const;

const LIMITE = 300;

export function limparValorRastreio(valor: unknown): string {
  const v = String(valor ?? "").trim();
  if (!v || v.includes("{{") || v.includes("}}")) return "";
  return v.slice(0, LIMITE);
}

/** Monta o rastreio a partir de um leitor de campos; tudo vazio vira `null`. */
export function montarRastreio(ler: (campo: string) => unknown): Rastreio | null {
  const r = Object.fromEntries(CAMPOS_RASTREIO.map((c) => [c, limparValorRastreio(ler(c))])) as Rastreio;
  return CAMPOS_RASTREIO.some((c) => r[c]) ? r : null;
}
