"use client";

import { startTransition, useActionState } from "react";
import type { Resultado } from "@/lib/recrutamento/tipos";

/**
 * Formulário que chama uma ação do servidor e mostra o resultado embaixo do
 * botão: o erro em vermelho (o porquê, em português), ou a confirmação.
 *
 * O botão fica desligado enquanto salva — clique duplo em "Reprovar" não pode
 * agendar duas negativas.
 */
export default function FormularioAcao({
  acao,
  children,
  botao,
  variante = "primario",
  confirmar,
  className = "",
}: {
  acao: (estado: Resultado | null, dados: FormData) => Promise<Resultado>;
  children?: React.ReactNode;
  botao: string;
  variante?: "primario" | "secundario" | "perigo";
  /** Pergunta antes de enviar — para o que tem consequência para o candidato. */
  confirmar?: string;
  className?: string;
}) {
  const [estado, enviar, salvando] = useActionState(acao, null);

  const estilos = {
    primario: "bg-royal-vivo text-white hover:bg-royal",
    secundario: "border border-linha bg-superficie text-navy-900 hover:border-royal/40",
    perigo: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };

  return (
    /*
     * Envio pelo onSubmit, e não por `action={enviar}`: com `action`, o React
     * limpa o formulário ao terminar — inclusive quando a resposta é erro, e a
     * pessoa perderia tudo o que digitou só porque faltou o motivo.
     */
    <form
      // Só vale antes de a página terminar de carregar: depois, o onSubmit
      // abaixo assume e a ação não roda duas vezes.
      action={enviar}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviar(dados));
      }}
    >
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className={`rounded-[9px] px-3.5 py-2 text-[0.8rem] font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${estilos[variante]}`}
        >
          {salvando ? "Salvando…" : botao}
        </button>
        {estado && !estado.ok && (
          <p role="alert" className="text-[0.8rem] text-red-700">
            {estado.erro}
          </p>
        )}
        {estado?.ok && estado.mensagem && <p className="text-[0.8rem] text-green-700">{estado.mensagem}</p>}
      </div>
    </form>
  );
}
