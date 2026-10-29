import Menu from "@/components/recrutamento/menu";
import { lerBanco } from "@/lib/recrutamento/dados";
import { pendencias as contarPendencias } from "@/lib/recrutamento/consultas";
import { rotinas } from "@/lib/recrutamento/envio";
import { PAPEIS, type Papel } from "@/lib/recrutamento/permissoes";
import { obterSessao } from "@/lib/recrutamento/sessao";
import { sair } from "../login/acoes";
import { trocarPapelAcao } from "./rh/recrutamento/actions";

/**
 * A moldura: menu, quem está usando e, no protótipo, o seletor "ver como".
 *
 * Também faz o papel do agendador: a cada tela aberta, manda os e-mails que já
 * passaram da hora e apaga quem passou do prazo de guarda (LGPD). O agendador
 * da Vercel (`/api/cron/recrutamento`) faz o mesmo uma vez por dia, para o
 * lembrete das 9h sair mesmo sem ninguém abrir o painel.
 */
// Toda tela lê o banco na hora: nada de montar a página no build e servir dado velho.
export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const agora = new Date();
  await rotinas(agora);

  const sessao = await obterSessao();
  const temAcesso = sessao.pode("recrutamento", "ver");
  const p = temAcesso ? contarPendencias(await lerBanco(), agora) : null;
  const pendencias = {
    "/rh/recrutamento": p?.total ?? 0,
    "/rh/recrutamento/entrevistas": p?.entrevistasHoje ?? 0,
  };

  const rodape = sessao.real ? (
    <form action={sair} className="space-y-1.5">
      <p className="truncate text-[0.75rem] text-estrela">{sessao.nome}</p>
      {sessao.papel && <p className="text-[0.65rem] uppercase tracking-[0.14em] text-estrela/50">{PAPEIS[sessao.papel].rotulo}</p>}
      <button className="rounded-md bg-estrela/10 px-2 py-1 text-[0.72rem] text-estrela hover:bg-estrela/20">Sair</button>
    </form>
  ) : (
    <form action={trocarPapelAcao} className="space-y-1.5">
      <label htmlFor="papel" className="block text-[0.65rem] uppercase tracking-[0.14em] text-estrela/50">
        Ver como (simulação)
      </label>
      <div className="flex gap-1.5">
        <select
          id="papel"
          name="papel"
          defaultValue={sessao.papel ?? "master"}
          className="min-w-0 flex-1 rounded-md border border-estrela/15 bg-horizonte/60 px-2 py-1.5 text-[0.75rem] text-estrela"
        >
          {(Object.keys(PAPEIS) as Papel[]).map((p) => (
            <option key={p} value={p}>
              {PAPEIS[p].rotulo} — {PAPEIS[p].exemplo}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-estrela/10 px-2 text-[0.72rem] text-estrela hover:bg-estrela/20">Trocar</button>
      </div>
    </form>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Menu pendencias={pendencias} semAcesso={!temAcesso} rodape={rodape} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!sessao.real && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[0.75rem] text-amber-900 md:px-8">
            <strong>Protótipo.</strong> Dados fictícios, guardados só neste computador. Nenhum e-mail sai de verdade.
            Usando como <strong>{sessao.nome}</strong> ({sessao.papel ? PAPEIS[sessao.papel].rotulo : "sem acesso"}).
          </div>
        )}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {temAcesso ? (
            children
          ) : (
            <div className="painel mx-auto mt-16 max-w-md p-8 text-center">
              <h1 className="titulo-pagina text-lg text-navy-900">Sem acesso ao painel de contratação</h1>
              <p className="mt-2 text-[0.83rem] text-tenue">
                {sessao.real
                  ? "Este login não está cadastrado no painel. Fale com o Nicolas."
                  : "Este tipo de login não vê o recrutamento. Troque o “ver como” no rodapé do menu."}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
