/**
 * Os dados no Supabase — schema `recrutamento` e bucket privado `recrutamento`.
 *
 * Só o servidor fala com o banco, com a chave secreta, e sempre DEPOIS de a
 * ação conferir o login e o papel (`sessao.ts`). O navegador nunca recebe a
 * chave nem consulta estas tabelas.
 *
 * Gravar: o motor do processo altera o banco em memória; aqui se compara o
 * antes e o depois e manda só o que mudou para `recrutamento.aplicar`, que grava
 * tudo numa transação só. Duas pessoas mexendo na MESMA candidatura no mesmo
 * segundo: vale a última. Em candidaturas diferentes, nada se perde.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Banco, Configuracao } from "./tipos.ts";

const BUCKET = "recrutamento";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cliente = SupabaseClient<any, any, any>;
let cliente: Cliente | null = null;
function banco(): Cliente {
  cliente ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "recrutamento" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

/** Cliente da chave secreta, para quem precisa ir além de ler e gravar o banco (fila de e-mails). */
export function clienteServico(): Cliente {
  return banco();
}

type Colecao = "vagas" | "candidatos" | "candidaturas" | "contatos" | "eventos" | "emails";

const TABELAS: Record<Colecao, string> = {
  vagas: "vaga",
  candidatos: "candidato",
  candidaturas: "candidatura",
  contatos: "contato",
  eventos: "evento",
  emails: "email",
};

/**
 * Colunas de momento (timestamptz). O banco devolve "…+00:00"; o app compara
 * momentos como texto ISO ("…Z"), então tudo volta no formato de `toISOString`.
 */
const MOMENTOS: Record<Colecao, string[]> = {
  vagas: ["criado_em"],
  candidatos: ["consentimento_em", "criado_em"],
  candidaturas: ["confirmado_em", "criado_em", "atualizado_em"],
  contatos: ["em"],
  eventos: ["em"],
  emails: ["agendado_para", "enviado_em", "criado_em"],
};

function normalizar(colecao: Colecao, linha: Record<string, unknown>) {
  for (const campo of MOMENTOS[colecao]) {
    const v = linha[campo];
    if (typeof v === "string") linha[campo] = new Date(v).toISOString();
  }
  // Coluna nova (29/10) aceita vazio no banco para a versão antiga do app não quebrar ao gravar.
  if (colecao === "vagas" && linha.diferenciais == null) linha.diferenciais = "";
  return linha;
}

/** Tudo de uma tabela, em páginas de 1.000 (o banco corta aí sem avisar), em ordem estável. */
async function tudo(tabela: string): Promise<Record<string, unknown>[]> {
  const linhas: Record<string, unknown>[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await banco().from(tabela).select("*").order("id").range(de, de + 999);
    if (error) throw new Error(`Erro ao ler ${tabela}: ${error.message}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) return linhas;
  }
}

export async function lerBanco(): Promise<Banco> {
  const colecoes = Object.keys(TABELAS) as Colecao[];
  const [config, limpezas, ...listas] = await Promise.all([
    banco().from("config").select("dados").single(),
    banco().from("limpeza_lgpd").select("em, candidatos").order("id"),
    ...colecoes.map((c) => tudo(TABELAS[c])),
  ]);
  if (config.error) throw new Error(`Erro ao ler a configuração: ${config.error.message}`);
  if (limpezas.error) throw new Error(`Erro ao ler as limpezas: ${limpezas.error.message}`);
  const resultado = {
    versao: 1,
    config: config.data.dados as Configuracao,
    limpezas_lgpd: (limpezas.data ?? []).map((l) => ({ em: new Date(l.em).toISOString(), candidatos: l.candidatos })),
  } as Banco;
  colecoes.forEach((c, i) => {
    (resultado as unknown as Record<string, unknown>)[c] = listas[i].map((l) => normalizar(c, l));
  });
  return resultado;
}

export async function transacao<T>(fn: (banco: Banco) => T): Promise<T> {
  const atual = await lerBanco();
  const antes = structuredClone(atual);
  const resultado = fn(atual);

  const mudancas: Record<string, unknown> = {};
  for (const c of Object.keys(TABELAS) as Colecao[]) {
    const velhas = new Map((antes[c] as { id: string }[]).map((l) => [l.id, JSON.stringify(l)]));
    const novas = atual[c] as { id: string }[];
    const ficam = new Set(novas.map((l) => l.id));
    const gravar = novas.filter((l) => velhas.get(l.id) !== JSON.stringify(l));
    const apagar = [...velhas.keys()].filter((id) => !ficam.has(id));
    if (gravar.length || apagar.length) mudancas[TABELAS[c]] = { gravar, apagar };
  }
  if (JSON.stringify(antes.config) !== JSON.stringify(atual.config)) mudancas.config = atual.config;
  const novasLimpezas = atual.limpezas_lgpd.slice(antes.limpezas_lgpd.length);
  if (novasLimpezas.length) mudancas.limpezas_lgpd = novasLimpezas;

  if (Object.keys(mudancas).length) {
    const { error } = await banco().rpc("aplicar", { p: mudancas });
    if (error) throw new Error(`Erro ao gravar: ${error.message}`);
  }
  return resultado;
}

// ─── Arquivos (bucket privado `recrutamento`, caminho `<id>/<nome>`) ────────

export async function salvarArquivo(id: string, nome: string, tipo: string, conteudo: Buffer) {
  const { error } = await banco().storage.from(BUCKET).upload(`${id}/${nome}`, conteudo, { contentType: tipo });
  if (error) throw new Error(`Erro ao guardar o arquivo: ${error.message}`);
}

export async function lerArquivo(id: string): Promise<{ nome: string; conteudo: Buffer } | null> {
  const { data: lista } = await banco().storage.from(BUCKET).list(id, { limit: 1 });
  const nome = lista?.[0]?.name;
  if (!nome) return null;
  const { data, error } = await banco().storage.from(BUCKET).download(`${id}/${nome}`);
  if (error || !data) return null;
  return { nome, conteudo: Buffer.from(await data.arrayBuffer()) };
}

export async function apagarArquivos(ids: string[]) {
  const caminhos: string[] = [];
  for (const id of ids) {
    const { data } = await banco().storage.from(BUCKET).list(id);
    caminhos.push(...(data ?? []).map((a) => `${id}/${a.name}`));
  }
  if (caminhos.length) await banco().storage.from(BUCKET).remove(caminhos);
}
