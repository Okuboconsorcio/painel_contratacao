/**
 * Onde os dados moram. Dois jeitos, escolhidos pela configuração:
 *
 * - **Supabase** (o sistema de verdade): quando existem `NEXT_PUBLIC_SUPABASE_URL`
 *   e `SUPABASE_SERVICE_ROLE_KEY`. Schema `recrutamento` e bucket privado
 *   `recrutamento` — ver `supabase/migrations/` e `dados-supabase.ts`.
 * - **Arquivo local** (protótipo e testes): sem essas variáveis. Um JSON em
 *   `.dados/banco.json` e os currículos em `.dados/arquivos/`, com pessoas
 *   fictícias. Dá para usar, errar e zerar à vontade (`npm run dados:zerar`).
 *
 * O resto do app não sabe qual dos dois está em uso: lê com `lerBanco`, grava
 * com `transacao` e guarda arquivo com `salvarArquivo`.
 */

import fs from "node:fs";
import path from "node:path";
import { ErroRegra } from "./processo.ts";
import { criarSemente } from "./semente.ts";
import type { Arquivo, Banco } from "./tipos.ts";
import * as supa from "./dados-supabase.ts";

export function modoSupabase(): boolean {
  const configurado = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  // Na Vercel não há arquivo local: sem a chave, é erro de configuração, não protótipo.
  if (!configurado && process.env.VERCEL) {
    throw new Error("Falta configurar NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.");
  }
  return configurado;
}

const PASTA = path.join(process.cwd(), ".dados");
const ARQUIVO = path.join(PASTA, "banco.json");
const PASTA_ARQUIVOS = path.join(PASTA, "arquivos");

function lerArquivoLocal(): Banco {
  if (!fs.existsSync(ARQUIVO)) {
    const semente = criarSemente(new Date());
    gravarLocal(semente);
    return semente;
  }
  return JSON.parse(fs.readFileSync(ARQUIVO, "utf8")) as Banco;
}

/** Grava num arquivo temporário e troca — um travamento no meio não corrompe o banco. */
function gravarLocal(banco: Banco) {
  fs.mkdirSync(PASTA, { recursive: true });
  const tmp = `${ARQUIVO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(banco, null, 1), "utf8");
  fs.renameSync(tmp, ARQUIVO);
}

export async function lerBanco(): Promise<Banco> {
  return modoSupabase() ? supa.lerBanco() : lerArquivoLocal();
}

/**
 * Lê, deixa a função (o motor do processo) alterar e grava. Se a função lançar
 * erro, nada é gravado. No Supabase, só o que mudou vai para o banco, numa
 * transação só (`recrutamento.aplicar`).
 */
export async function transacao<T>(fn: (banco: Banco) => T): Promise<T> {
  if (modoSupabase()) return supa.transacao(fn);
  const banco = lerArquivoLocal();
  const resultado = fn(banco);
  gravarLocal(banco);
  return resultado;
}

export function novoId(prefixo: string): string {
  return `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Nome de arquivo sem acento nem espaço. O Storage da Supabase recusa acento —
 * o arquivo local segue a mesma regra para o comportamento ser igual.
 */
export function normalizarNome(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
  return limpo.slice(-80) || "arquivo";
}

const TIPOS_ACEITOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

// A Vercel recusa envio acima de 4,5 MB antes de chegar ao código; 4 MB deixa folga.
export const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/** Valida e guarda um arquivo enviado. Devolve `null` se não veio arquivo. */
export async function salvarArquivo(arquivo: File | null): Promise<Arquivo | null> {
  if (!arquivo || arquivo.size === 0) return null;
  if (arquivo.size > TAMANHO_MAXIMO) throw new ErroRegra("O arquivo passa de 4 MB. Envie um PDF menor ou uma foto mais leve.");
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ErroRegra("Envie PDF, Word, JPG ou PNG.");
  }
  const id = novoId("arq");
  const nome = normalizarNome(arquivo.name);
  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  if (modoSupabase()) {
    await supa.salvarArquivo(id, nome, arquivo.type, conteudo);
  } else {
    fs.mkdirSync(PASTA_ARQUIVOS, { recursive: true });
    fs.writeFileSync(path.join(PASTA_ARQUIVOS, `${id}__${nome}`), conteudo);
  }
  return { id, nome, tipo: arquivo.type, tamanho: arquivo.size };
}

export async function lerArquivo(id: string): Promise<{ nome: string; conteudo: Buffer } | null> {
  if (!/^arq_[a-z0-9]+$/.test(id)) return null;
  if (modoSupabase()) return supa.lerArquivo(id);
  if (!fs.existsSync(PASTA_ARQUIVOS)) return null;
  const achado = fs.readdirSync(PASTA_ARQUIVOS).find((n) => n.startsWith(`${id}__`));
  if (!achado) return null;
  return {
    nome: achado.slice(id.length + 2),
    conteudo: fs.readFileSync(path.join(PASTA_ARQUIVOS, achado)),
  };
}

/** Apaga os arquivos que o motor mandou apagar (limpeza LGPD). */
export async function apagarArquivos(ids: string[]) {
  if (!ids.length) return;
  if (modoSupabase()) return supa.apagarArquivos(ids);
  if (!fs.existsSync(PASTA_ARQUIVOS)) return;
  for (const nome of fs.readdirSync(PASTA_ARQUIVOS)) {
    if (ids.some((id) => nome.startsWith(`${id}__`))) fs.rmSync(path.join(PASTA_ARQUIVOS, nome), { force: true });
  }
}

/** Só no arquivo local: apaga tudo e recria os dados de exemplo (`npm run dados:zerar`). */
export function zerar() {
  fs.rmSync(PASTA, { recursive: true, force: true });
  return lerArquivoLocal();
}
