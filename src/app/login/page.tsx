import { redirect } from "next/navigation";
import { modoSupabase } from "@/lib/recrutamento/dados";
import { entrar } from "./acoes";

const AVISOS: Record<string, string> = {
  invalido: "E-mail ou senha não conferem.",
  sem_acesso: "Este login não tem acesso ao painel de contratação. Fale com o Nicolas.",
  saiu: "Você saiu do painel.",
};

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  // No protótipo não há login.
  if (!modoSupabase()) redirect("/rh/recrutamento");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form action={entrar} className="painel w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="sobrancelha text-royal/70">Okubo · MGCON</p>
          <h1 className="titulo-pagina mt-1 text-xl text-navy-900">Painel de contratação</h1>
          <p className="mt-1 text-[0.8rem] text-tenue">Entre com o mesmo e-mail e senha do Polaris.</p>
        </div>
        {aviso && AVISOS[aviso] && (
          <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-900">
            {AVISOS[aviso]}
          </p>
        )}
        <div>
          <label htmlFor="email" className="rotulo-campo">
            E-mail
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
        </div>
        <div>
          <label htmlFor="senha" className="rotulo-campo">
            Senha
          </label>
          <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
        </div>
        <button className="w-full rounded-[9px] bg-royal-vivo px-3.5 py-2 text-[0.85rem] font-medium text-white hover:bg-royal">
          Entrar
        </button>
      </form>
    </main>
  );
}
