/**
 * Peças pequenas das telas do recrutamento: etiqueta de situação, link de
 * voltar, cartão de número e barra horizontal. Sem estado — servem tanto em
 * página de servidor quanto dentro de componente de cliente.
 */

import Link from "next/link";
import { CLASSES_BADGE, type CorBadge } from "@/lib/recrutamento/opcoes";

export function Etiqueta({ cor, children, title }: { cor: CorBadge; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${CLASSES_BADGE[cor]}`}
    >
      {children}
    </span>
  );
}

/** Toda tela que não está no menu tem "← Voltar para …" (regra das telas do Polaris). */
export function Voltar({ href, para }: { href: string; para: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[0.8rem] text-tenue hover:text-royal-vivo">
      <span aria-hidden>←</span> Voltar para {para}
    </Link>
  );
}

export function CartaoNumero({
  rotulo,
  valor,
  detalhe,
  href,
  destaque = false,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  href?: string;
  destaque?: boolean;
}) {
  const corpo = (
    <>
      <p className={`rotulo-painel ${destaque ? "text-royal-vivo" : "text-tenue"}`}>{rotulo}</p>
      <p className="numero-painel mt-1.5 text-[1.7rem] leading-none text-navy-900">{valor}</p>
      {detalhe && <p className="mt-1.5 text-[0.75rem] text-tenue">{detalhe}</p>}
    </>
  );
  const classe = `painel block p-4 ${destaque ? "ring-1 ring-royal-vivo/30" : ""}`;
  return href ? (
    <Link href={href} className={`${classe} transition-transform hover:-translate-y-0.5`}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}

/**
 * Barra horizontal com rótulo e número. Uma cor só (royal) — gráfico de
 * contagem não precisa de arco-íris; a segunda cor, quando há, é o "dentre
 * estes" (ex.: aprovados dentre os inscritos).
 */
export function Barra({
  rotulo,
  valor,
  maximo,
  parte,
  sufixo,
}: {
  rotulo: string;
  valor: number;
  maximo: number;
  parte?: number;
  sufixo?: string;
}) {
  const largura = maximo ? (valor / maximo) * 100 : 0;
  const larguraParte = maximo && parte !== undefined ? (parte / maximo) * 100 : 0;
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(4rem,1fr)_auto] items-center gap-3 text-[0.8rem]">
      <span className="truncate text-foreground/80" title={rotulo}>
        {rotulo}
      </span>
      <span className="relative h-2.5 overflow-hidden rounded-full bg-linha/70">
        <span className="preenche absolute inset-y-0 left-0 rounded-full bg-royal/25" style={{ "--alvo": `${largura}%` } as React.CSSProperties} />
        {parte !== undefined && (
          <span
            className="preenche absolute inset-y-0 left-0 rounded-full bg-royal-vivo"
            style={{ "--alvo": `${larguraParte}%` } as React.CSSProperties}
          />
        )}
      </span>
      <span className="min-w-[3.5rem] text-right tabular-nums text-navy-900">
        {parte !== undefined ? `${parte} de ${valor}` : valor}
        {sufixo}
      </span>
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-linha px-4 py-6 text-center text-[0.83rem] text-tenue">{children}</p>;
}

export function Secao({
  titulo,
  children,
  acoes,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`painel p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="sobrancelha text-royal/80">{titulo}</h2>
        {acoes}
      </div>
      {children}
    </section>
  );
}

/** "(11) 90000-1234" → link do WhatsApp com DDI 55. */
export function linkWhatsApp(telefone: string, texto?: string) {
  const numero = `55${telefone.replace(/\D/g, "")}`;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
