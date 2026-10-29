"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CeuEstrelado, EstrelaPolaris, UrsaMenor } from "@/components/ceu";

/**
 * A barra lateral do protótipo, no mesmo céu do Polaris. No Polaris de verdade
 * ela não existe: estes itens entram como subitens de "Gestão de Pessoas" em
 * `src/lib/navegacao.tsx`, liberados pelo módulo `recrutamento`.
 */

export type ItemMenu = { href: string; rotulo: string; icone: React.ReactNode; pendencias?: number };

const BASE = "/rh/recrutamento";

export const ITENS: Omit<ItemMenu, "pendencias">[] = [
  { href: BASE, rotulo: "Painel", icone: <path d="M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-4H4v4ZM14 4v4h6V4h-6Z" strokeWidth="1.7" strokeLinejoin="round" /> },
  { href: `${BASE}/vagas`, rotulo: "Vagas", icone: <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6m-11 0h16v13H4V6Zm0 6h16" strokeWidth="1.7" strokeLinejoin="round" /> },
  { href: `${BASE}/candidatos`, rotulo: "Banco de currículos", icone: <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19m16 0v-1.5a3.5 3.5 0 0 0-2.5-3.35M14.5 4.15a3.5 3.5 0 0 1 0 6.7M13.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" strokeWidth="1.7" strokeLinecap="round" /> },
  { href: `${BASE}/entrevistas`, rotulo: "Entrevistas", icone: <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /> },
  { href: `${BASE}/emails`, rotulo: "E-mails", icone: <path d="M4 6h16v12H4V6Zm0 0 8 7 8-7" strokeWidth="1.7" strokeLinejoin="round" /> },
  { href: `${BASE}/indicadores`, rotulo: "Indicadores", icone: <path d="M4 20V10m6 10V4m6 16v-7m4 7H3" strokeWidth="1.7" strokeLinecap="round" /> },
];

export default function Menu({
  pendencias,
  rodape,
  semAcesso = false,
}: {
  pendencias: Record<string, number>;
  rodape: React.ReactNode;
  semAcesso?: boolean;
}) {
  const caminho = usePathname();

  return (
    <aside className="ceu-fundo relative flex w-full shrink-0 flex-col overflow-hidden text-estrela md:sticky md:top-0 md:h-screen md:w-60">
      <CeuEstrelado semente={31} quantidade={90} />
      <UrsaMenor className="-right-4 bottom-24 hidden h-[19rem] w-[7.5rem] md:block" />

      <div className="relative flex items-center gap-3 px-5 pb-4 pt-5 md:pb-6 md:pt-6">
        <span className="relative flex h-8 w-8 items-center justify-center">
          <span
            className="absolute h-8 w-8 rounded-full blur-md"
            style={{ background: "radial-gradient(circle, rgba(242,199,92,0.55), transparent 68%)" }}
          />
          <EstrelaPolaris className="relative h-[1.6rem] w-[1.6rem] text-polaris" respira />
        </span>
        <span>
          <span className="marca block text-[0.95rem] leading-none text-estrela">Polaris</span>
          <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.14em] text-estrela/50">
            Recrutamento
          </span>
        </span>
      </div>

      <nav className="relative flex flex-row gap-0.5 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:pb-4">
        {!semAcesso && ITENS.map((item) => {
          const ativo = item.href === BASE ? caminho === BASE : caminho.startsWith(item.href);
          const n = pendencias[item.href] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-2.5 text-[0.82rem] font-medium transition-colors duration-200 ${
                ativo ? "text-polaris" : "text-estrela/65 hover:bg-estrela/[0.06] hover:text-estrela"
              }`}
            >
              {ativo && (
                <>
                  <span
                    className="absolute inset-0 rounded-[10px]"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(42,70,200,0.45) 0%, rgba(42,70,200,0.07) 78%, transparent 100%)",
                    }}
                  />
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-polaris" />
                </>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="relative h-[1.05rem] w-[1.05rem] shrink-0" aria-hidden>
                {item.icone}
              </svg>
              <span className="relative flex-1">{item.rotulo}</span>
              {/* Bolinha só existe quando há algo esperando: bolinha com zero vira cenário. */}
              {n > 0 && (
                <span
                  title={`${n} esperando alguém agir`}
                  className={`relative min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[0.65rem] font-semibold tabular-nums ${
                    ativo ? "bg-polaris text-horizonte" : "bg-polaris/20 text-polaris"
                  }`}
                >
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-estrela/10 px-5 py-4">{rodape}</div>
    </aside>
  );
}
