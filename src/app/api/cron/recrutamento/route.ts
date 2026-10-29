import { enviarPendentes, limparVencidos } from "@/lib/recrutamento/envio";

/**
 * Agendador da Vercel (`vercel.json`): uma vez por dia, perto das 9h, manda os
 * lembretes de entrevista e apaga quem passou do prazo de guarda (LGPD), mesmo
 * que ninguém abra o painel. A Vercel manda `Authorization: Bearer <CRON_SECRET>`;
 * sem a variável configurada, a rota não faz nada.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "nao_autorizado" }, { status: 401 });
  }
  const agora = new Date();
  const enviados = await enviarPendentes(agora);
  const apagados = await limparVencidos(agora);
  return Response.json({ ok: true, enviados, apagados });
}
