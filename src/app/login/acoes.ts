"use server";

import { redirect } from "next/navigation";
import { clienteDoUsuario } from "@/lib/recrutamento/sessao";

export async function entrar(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const supabase = await clienteDoUsuario();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) redirect("/login?aviso=invalido");

  // O login é o mesmo do Polaris: só entra quem tem cadastro ativo no painel.
  const { data: perfil } = await supabase.from("usuario").select("id").eq("id", data.user.id).maybeSingle();
  if (!perfil) {
    // `local`: sai só deste sistema, sem derrubar a sessão do Polaris.
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?aviso=sem_acesso");
  }
  redirect("/rh/recrutamento");
}

export async function sair() {
  const supabase = await clienteDoUsuario();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?aviso=saiu");
}
