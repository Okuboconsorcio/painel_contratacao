"use client";

import { useState } from "react";

/**
 * Link da página pública da vaga (site da MGCON), com "copiar" — para colar no
 * WhatsApp, no Instagram ou no anúncio sem abrir a página.
 */
export default function LinkDaVaga({ url, compacto = false }: { url: string; compacto?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const curto = url.replace(/^https?:\/\/(www\.)?/, "");

  return (
    <span className={`inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 ${compacto ? "text-[0.72rem]" : "text-[0.8rem]"}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir a página da vaga em outra aba"
        className="inline-flex min-w-0 items-center gap-1 text-royal-vivo hover:underline"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1" />
          <path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1" />
        </svg>
        <span className="truncate">{curto}</span>
      </a>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
        className="rounded-md border border-linha bg-superficie px-2 py-0.5 font-medium text-navy-900 hover:border-royal/40"
      >
        {copiado ? "Copiado" : "Copiar link"}
      </button>
    </span>
  );
}
