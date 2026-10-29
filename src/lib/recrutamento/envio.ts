/**
 * O envio de verdade da fila de e-mails, e a limpeza LGPD — o que roda "sozinho".
 *
 * Chamado a cada tela aberta, depois de cada ação e pelo agendador da Vercel
 * (`/api/cron/recrutamento`, uma vez por dia, para o lembrete das 9h sair mesmo
 * sem ninguém abrir o painel).
 *
 * - **Arquivo local:** envio simulado, como no protótipo (`processarFila`).
 * - **Supabase:** reserva os e-mails no banco (`reservar_emails`, um envio só
 *   mesmo com duas telas abertas), manda pelo SMTP do Google e grava o
 *   resultado. Sem a senha do SMTP configurada, NÃO reserva nada: o e-mail fica
 *   agendado e sai quando a senha for posta — a tela de E-mails avisa.
 *
 * Nenhum erro de e-mail derruba a tela de quem estava trabalhando.
 */

import nodemailer from "nodemailer";
import { apagarArquivos, lerBanco, modoSupabase, transacao } from "./dados.ts";
import { clienteServico } from "./dados-supabase.ts";
import { processarFila } from "./emails.ts";
import { apagarVencidos, candidatosVencidos } from "./processo.ts";
import type { Email } from "./tipos.ts";

function smtp() {
  const usuario = process.env.EMAIL_SMTP_USUARIO;
  const senha = process.env.EMAIL_SMTP_SENHA;
  return usuario && senha ? { usuario, senha } : null;
}

/** A tela usa para não prometer o que não vai acontecer. */
export function envioLigado(): boolean {
  return !modoSupabase() || smtp() !== null;
}

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function mandar(e: Email, remetente: string): Promise<string | null> {
  const cfg = smtp()!;
  try {
    await nodemailer
      .createTransport({ host: "smtp.gmail.com", port: 587, secure: false, auth: { user: cfg.usuario, pass: cfg.senha.replace(/\s+/g, "") } })
      .sendMail({
        from: `"${remetente.replace(/"/g, "")}" <${cfg.usuario}>`,
        to: e.para.join(", "),
        subject: e.assunto,
        text: e.linhas.join("\n\n"),
        html: e.linhas.map((l) => `<p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937">${escapar(l)}</p>`).join(""),
      });
    return null;
  } catch (erro) {
    return erro instanceof Error ? erro.message.slice(0, 200) : "falha no envio";
  }
}

/** Manda o que já passou da hora. Devolve quantos saíram. */
export async function enviarPendentes(agora = new Date()): Promise<number> {
  if (!modoSupabase()) {
    const limite = agora.toISOString();
    if (!(await lerBanco()).emails.some((e) => e.situacao === "PENDENTE" && e.agendado_para <= limite)) return 0;
    return transacao((b) => processarFila(b, agora));
  }
  if (!smtp()) return 0;

  const banco = clienteServico();
  const { data: reservados, error } = await banco.rpc("reservar_emails");
  if (error || !reservados?.length) return 0;
  const { data: cfg } = await banco.from("config").select("dados").single();
  const remetente = (cfg?.dados as { remetente?: string } | null)?.remetente || "Recrutamento";

  let enviados = 0;
  for (const e of reservados as Email[]) {
    const falha = e.para.length ? await mandar(e, remetente) : "sem destinatário com e-mail";
    await banco.rpc("registrar_envio", { p_id: e.id, p_enviado: falha === null, p_motivo: falha ?? "" });
    if (falha === null) enviados++;
  }
  return enviados;
}

/** LGPD: apaga quem passou do prazo de guarda (e os arquivos dessas pessoas). */
export async function limparVencidos(agora = new Date()): Promise<number> {
  if (candidatosVencidos(await lerBanco(), agora).size === 0) return 0;
  let quantos = 0;
  // Grava o banco primeiro e só depois apaga os arquivos: se falhar no meio,
  // sobra arquivo sem dono, nunca ficha apontando para arquivo que sumiu.
  const arquivos = await transacao((b) => {
    quantos = candidatosVencidos(b, agora).size;
    return apagarVencidos(b, agora);
  });
  await apagarArquivos(arquivos.map((a) => a.id));
  return quantos;
}

/** O "agendador": e-mails na hora e limpeza LGPD. Nunca lança erro. */
export async function rotinas(agora = new Date()) {
  try {
    await enviarPendentes(agora);
  } catch {
    // e-mail que não saiu continua na fila e tenta de novo na próxima vez
  }
  try {
    await limparVencidos(agora);
  } catch {
    // tenta de novo na próxima vez
  }
}
