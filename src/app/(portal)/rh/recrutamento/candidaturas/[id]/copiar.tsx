"use client";

import { useState } from "react";

export default function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className="rounded-[9px] border border-linha bg-superficie px-3 py-1.5 text-[0.78rem] font-medium text-navy-900 hover:border-royal/40"
    >
      {copiado ? "Copiado" : "Copiar mensagem"}
    </button>
  );
}
