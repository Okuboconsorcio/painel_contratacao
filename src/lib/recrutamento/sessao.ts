/**
 * Quem está usando.
 *
 * - **Supabase:** o login de verdade (Supabase Auth, o mesmo e-mail e senha do
 *   Polaris). O papel vem de `recrutamento.usuario`; sem linha lá (ou
 *   desativado), a pessoa não tem acesso a nada.
 * - **Arquivo local (protótipo):** sem login. Um seletor no rodapé do menu
 *   troca o papel, guardado num cookie, para ver a tela como a Letícia, o
 *   Leonardo ou o Marco a veriam.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { modoSupabase } from "./dados.ts";
import { PAPEIS, pode as podePapel, type AcaoPermissao, type Modulo, type Papel } from "./permissoes.ts";

export type Sessao = {
  nome: string;
  /** `null`: logado, mas sem acesso ao painel. */
  papel: Papel | null;
  /** `true` no sistema de verdade (login); `false` no protótipo ("ver como"). */
  real: boolean;
  pode: (modulo: Modulo, acao: AcaoPermissao) => boolean;
};

export function chavePublica() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

/** Cliente com a sessão de quem está logado (só para o login e para ler o próprio papel). */
export async function clienteDoUsuario() {
  const loja = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chavePublica(), {
    db: { schema: "recrutamento" },
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => loja.set(name, value, options));
        } catch {
          // Chamado de uma página: quem renova a sessão é o proxy.
        }
      },
    },
  });
}

const montar = (nome: string, papel: Papel | null, real: boolean): Sessao => ({
  nome,
  papel,
  real,
  pode: (modulo, acao) => papel !== null && podePapel(papel, modulo, acao),
});

export async function obterSessao(): Promise<Sessao> {
  if (modoSupabase()) {
    const supabase = await clienteDoUsuario();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return montar("", null, true);
    const { data: perfil } = await supabase.from("usuario").select("nome, papel").eq("id", user.id).maybeSingle();
    return perfil ? montar(perfil.nome, perfil.papel as Papel, true) : montar(user.email ?? "", null, true);
  }
  const jar = await cookies();
  const valor = jar.get("papel")?.value as Papel | undefined;
  const papel: Papel = valor && valor in PAPEIS ? valor : "master";
  return montar(PAPEIS[papel].exemplo, papel, false);
}
