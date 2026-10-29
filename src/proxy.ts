import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Primeira barreira do sistema de verdade: sem login, vai para /login. Também
 * renova a sessão do Supabase a cada tela. A permissão de cada coisa é
 * conferida de novo na página e na ação — isto só tira quem não entrou.
 *
 * No protótipo (sem Supabase configurado) não faz nada.
 */

const LIVRES = ["/login", "/api/recrutamento/inscricao", "/api/cron/"];

export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const caminho = req.nextUrl.pathname;
  if (LIVRES.some((l) => caminho === l || caminho.startsWith(l))) return res;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const r = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
