import { EstrelaPolaris } from "@/components/ceu";

/**
 * O cabeçalho de uma tela: de que bloco ela é, como se chama e o que está
 * sendo mostrado agora.
 *
 * A linha de baixo (`resumo`) muda conforme o filtro — "320 vendas entre 20/07
 * e 19/08". É a informação que responde "estou olhando o quê?", e por isso fica
 * grudada no título, não perdida no meio da tela.
 */
export default function CabecalhoPagina({
  bloco,
  titulo,
  resumo,
  acoes,
}: {
  /** Nome do bloco: Vendas, Pós-vendas… Some quando a tela não pertence a um. */
  bloco?: string;
  titulo: string;
  resumo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {bloco && (
          <p className="sobrancelha flex items-center gap-1.5 text-royal/70">
            <EstrelaPolaris className="h-2.5 w-2.5 text-polaris" />
            {bloco}
          </p>
        )}

        <h1 className="titulo-pagina mt-1.5 text-[1.4rem] leading-tight text-navy-900">
          {titulo}
        </h1>

        {resumo && (
          <p className="mt-1 text-[0.83rem] leading-relaxed text-tenue">
            {resumo}
          </p>
        )}
      </div>

      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </div>
  );
}
