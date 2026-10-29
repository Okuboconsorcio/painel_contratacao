import Link from "next/link";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import { Barra, CartaoNumero, Secao, Vazio } from "@/components/recrutamento/pecas";
import { indicadores } from "@/lib/recrutamento/consultas";
import { lerBanco } from "@/lib/recrutamento/dados";

const BASE = "/rh/recrutamento";
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Indicadores do processo (tarefa do documento: "criar indicadores de
 * resultados do processo para serem analisados posteriormente").
 */
export default async function Indicadores({ searchParams }: { searchParams: Promise<{ vaga?: string }> }) {
  const { vaga } = await searchParams;
  const banco = await lerBanco();
  const i = indicadores(banco, vaga || undefined);
  const nomeVaga = vaga ? banco.vagas.find((v) => v.id === vaga) : null;
  const topoFunil = i.funil[0]?.quantidade ?? 0;
  const maxOrigem = Math.max(0, ...i.origens.map((o) => o.inscritos));
  const maxMotivo = Math.max(0, ...i.motivos.map((m) => m.n));

  return (
    <div className="surge space-y-6">
      <CabecalhoPagina
        bloco="Recrutamento"
        titulo="Indicadores"
        resumo={`${i.total} candidatura(s) ${nomeVaga ? `na vaga ${nomeVaga.titulo} (${nomeVaga.aberta_em?.split("-").reverse().join("/") ?? "rascunho"})` : "em todas as vagas"}`}
      />

      <div className="flex flex-wrap gap-1.5">
        <Link href={`${BASE}/indicadores`} className={`rounded-full px-3 py-1 text-[0.78rem] font-medium ${!vaga ? "bg-royal-vivo text-white" : "border border-linha bg-superficie text-navy-900"}`}>
          Todas as vagas
        </Link>
        {banco.vagas
          .filter((v) => v.aberta_em)
          .map((v) => (
            <Link
              key={v.id}
              href={`${BASE}/indicadores?vaga=${v.id}`}
              className={`rounded-full px-3 py-1 text-[0.78rem] font-medium ${vaga === v.id ? "bg-royal-vivo text-white" : "border border-linha bg-superficie text-navy-900"}`}
            >
              {v.titulo} · {v.aberta_em!.split("-").reverse().slice(0, 2).join("/")}
            </Link>
          ))}
      </div>

      {i.total === 0 ? (
        <Vazio>Sem candidaturas para medir ainda.</Vazio>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <CartaoNumero rotulo="Candidaturas" valor={i.total} />
            <CartaoNumero rotulo="Em andamento" valor={i.emAndamento} />
            <CartaoNumero rotulo="Admitidos" valor={i.admitidos} detalhe={`${pct(i.conversao)} das candidaturas`} />
            <CartaoNumero rotulo="Reprovados" valor={i.reprovados} />
            <CartaoNumero rotulo="Desistências" valor={i.desistentes} />
            <CartaoNumero rotulo="Reserva" valor={i.reserva} detalhe={i.notaMediaTriagem !== null ? `nota média de triagem ${i.notaMediaTriagem.toLocaleString("pt-BR")}` : undefined} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Secao titulo="Funil — quantos chegaram a cada etapa">
              <div className="space-y-2.5">
                {i.funil.map((f, k) => (
                  <Barra
                    key={f.etapa}
                    rotulo={f.rotulo}
                    valor={f.quantidade}
                    maximo={topoFunil}
                    sufixo={k > 0 && i.funil[k - 1].quantidade ? ` · ${pct(f.quantidade / i.funil[k - 1].quantidade)}` : ""}
                  />
                ))}
              </div>
              <p className="mt-3 text-[0.72rem] text-tenue">
                A porcentagem é de quem passou da etapa anterior. Quem foi encerrado conta até a etapa em que estava.
              </p>
            </Secao>

            <Secao titulo="De onde vêm — inscritos e aprovados">
              <div className="space-y-2.5">
                {i.origens.map((o) => (
                  <Barra key={o.origem} rotulo={o.origem} valor={o.inscritos} parte={o.aprovados} maximo={maxOrigem} />
                ))}
              </div>
              <p className="mt-3 text-[0.72rem] text-tenue">
                Barra clara = inscritos; escura = aprovados após a entrevista. Mostra qual canal traz gente que passa, não só
                volume.
              </p>
            </Secao>

            <Secao titulo="Por que saíram">
              {i.motivos.length === 0 ? (
                <p className="text-[0.8rem] text-tenue">Ninguém encerrado ainda.</p>
              ) : (
                <div className="space-y-2.5">
                  {i.motivos.map((m) => (
                    <Barra key={m.motivo} rotulo={m.motivo} valor={m.n} maximo={maxMotivo} />
                  ))}
                </div>
              )}
            </Secao>

            <Secao titulo="Tempo médio entre as etapas">
              <table className="w-full text-[0.8rem]">
                <tbody className="divide-y divide-linha">
                  {i.tempos.map((t) => (
                    <tr key={t.rotulo}>
                      <td className="py-2 text-tenue">{t.rotulo}</td>
                      <td className="py-2 text-right tabular-nums text-navy-900">
                        {t.dias === null ? "—" : `${t.dias.toLocaleString("pt-BR")} dia(s)`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 rounded-lg bg-background p-3 text-[0.8rem]">
                <p className="rotulo-campo">Comparecimento às entrevistas</p>
                {i.comparecimento.marcadas ? (
                  <p className="text-navy-900">
                    {i.comparecimento.compareceram} de {i.comparecimento.marcadas} compareceram (
                    {pct(i.comparecimento.compareceram / i.comparecimento.marcadas)}) · {i.comparecimento.faltaram} faltaram
                  </p>
                ) : (
                  <p className="text-tenue">Nenhuma entrevista passada ainda.</p>
                )}
              </div>
            </Secao>
          </div>
        </>
      )}
    </div>
  );
}
