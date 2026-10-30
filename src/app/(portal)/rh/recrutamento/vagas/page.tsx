import Link from "next/link";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import { Etiqueta, Vazio } from "@/components/recrutamento/pecas";
import { diaLongo } from "@/lib/recrutamento/datas";
import { lerBanco } from "@/lib/recrutamento/dados";
import LinkDaVaga from "@/components/recrutamento/link-vaga";
import { ETAPAS, paginaDaVaga, SITUACOES_VAGA } from "@/lib/recrutamento/opcoes";
import { faltaParaAbrir } from "@/lib/recrutamento/regras";
import { obterSessao } from "@/lib/recrutamento/sessao";
import type { SituacaoVaga } from "@/lib/recrutamento/tipos";

const BASE = "/rh/recrutamento";
const ORDEM: SituacaoVaga[] = ["ABERTA", "PAUSADA", "RASCUNHO", "ENCERRADA"];

export default async function Vagas() {
  const banco = await lerBanco();
  const sessao = await obterSessao();
  const vagas = [...banco.vagas].sort(
    (a, b) => ORDEM.indexOf(a.situacao) - ORDEM.indexOf(b.situacao) || b.criado_em.localeCompare(a.criado_em)
  );

  return (
    <div className="surge space-y-6">
      <CabecalhoPagina
        bloco="Recrutamento"
        titulo="Vagas"
        resumo={`${vagas.length} vaga(s) · ${vagas.filter((v) => v.situacao === "ABERTA").length} aberta(s)`}
        acoes={
          sessao.pode("recrutamento", "criar") && (
            <Link href={`${BASE}/vagas/nova`} className="rounded-[9px] bg-royal-vivo px-3.5 py-2 text-[0.8rem] font-medium text-white hover:bg-royal">
              Nova vaga
            </Link>
          )
        }
      />

      {vagas.length === 0 ? (
        <Vazio>Nenhuma vaga cadastrada.</Vazio>
      ) : (
        <div className="painel overflow-x-auto">
          <table className="w-full text-[0.83rem]">
            <thead className="cabecalho-tabela border-b border-linha text-left">
              <tr>
                <th className="px-4 py-3">Vaga</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Aberta em</th>
                <th className="px-4 py-3 text-right">Inscritos</th>
                <th className="px-4 py-3 text-right">Em andamento</th>
                <th className="px-4 py-3 text-right">Admitidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {vagas.map((v) => {
                const cs = banco.candidaturas.filter((c) => c.vaga_id === v.id);
                const falta = v.situacao === "RASCUNHO" ? faltaParaAbrir(v) : [];
                return (
                  <tr key={v.id} className="hover:bg-background">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link href={`${BASE}/vagas/${v.id}`} className="font-medium text-navy-900 hover:text-royal-vivo">
                          {v.titulo}
                        </Link>
                        {/* Só vaga aberta está na página pública; as outras dariam "não encontrada". */}
                        {v.situacao === "ABERTA" && <LinkDaVaga url={paginaDaVaga(v.slug)} compacto />}
                      </div>
                      <p className="text-[0.75rem] text-tenue">
                        {v.empresa} · {v.quantidade} vaga(s)
                        {falta.length > 0 && <span className="text-amber-800"> · falta {falta.join(", ")}</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Etiqueta cor={SITUACOES_VAGA[v.situacao].cor}>{SITUACOES_VAGA[v.situacao].rotulo}</Etiqueta>
                    </td>
                    <td className="px-4 py-3 text-tenue">{v.aberta_em ? diaLongo(v.aberta_em) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{cs.length}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {cs.filter((c) => !ETAPAS[c.etapa].encerrada && c.etapa !== "ADMISSAO").length}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{cs.filter((c) => c.etapa === "ADMISSAO").length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
