import Link from "next/link";
import { notFound } from "next/navigation";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import CicloVaga from "@/components/recrutamento/ciclo-vaga";
import FormularioAcao from "@/components/recrutamento/formulario-acao";
import { Etiqueta, Secao, Voltar } from "@/components/recrutamento/pecas";
import { diasNaEtapa } from "@/lib/recrutamento/consultas";
import { diaDe, diaLongo, hoje, momento, proximaSegunda } from "@/lib/recrutamento/datas";
import { lerBanco } from "@/lib/recrutamento/dados";
import { ENCERRADAS, ETAPAS, FUNIL, SITUACOES_VAGA } from "@/lib/recrutamento/opcoes";
import { faltaParaAbrir } from "@/lib/recrutamento/regras";
import { obterSessao } from "@/lib/recrutamento/sessao";
import { situacaoVagaAcao } from "../../actions";

const BASE = "/rh/recrutamento";

export default async function VagaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banco = await lerBanco();
  const vaga = banco.vagas.find((v) => v.id === id);
  if (!vaga) notFound();
  const sessao = await obterSessao();
  const podeEditar = sessao.pode("recrutamento", "editar");

  const cs = banco.candidaturas.filter((c) => c.vaga_id === vaga.id);
  const candidato = new Map(banco.candidatos.map((c) => [c.id, c]));
  const falta = faltaParaAbrir(vaga);
  const sugestaoAbertura = proximaSegunda(hoje(), true);

  const botaoSituacao = (para: "ABERTA" | "PAUSADA" | "ENCERRADA", rotulo: string, confirmar?: string) => (
    <FormularioAcao acao={situacaoVagaAcao} botao={rotulo} variante={para === "ABERTA" ? "primario" : "secundario"} confirmar={confirmar}>
      <input type="hidden" name="vaga_id" value={vaga.id} />
      <input type="hidden" name="para" value={para} />
    </FormularioAcao>
  );

  const detalhes: [string, string][] = [
    ["Salário", vaga.salario],
    ["Remuneração", vaga.remuneracao],
    ["Benefícios", vaga.beneficios],
    ["Horário", vaga.horario],
    ["Local", vaga.local],
    ["Responsável pela triagem", vaga.responsavel_nome],
  ];

  return (
    <div className="surge space-y-6">
      <Voltar href={`${BASE}/vagas`} para="Vagas" />
      <CabecalhoPagina
        bloco={`Vaga · ${vaga.empresa}`}
        titulo={vaga.titulo}
        resumo={
          <span className="flex flex-wrap items-center gap-2">
            <Etiqueta cor={SITUACOES_VAGA[vaga.situacao].cor}>{SITUACOES_VAGA[vaga.situacao].rotulo}</Etiqueta>
            {vaga.quantidade} vaga(s) · {cs.length} candidatura(s)
            {vaga.aberta_em && ` · aberta em ${diaLongo(vaga.aberta_em)}`}
            {vaga.encerrada_em && ` · encerrada em ${diaLongo(vaga.encerrada_em)}`}
          </span>
        }
        acoes={
          podeEditar && (
            <Link href={`${BASE}/vagas/${vaga.id}/editar`} className="rounded-[9px] border border-linha bg-superficie px-3.5 py-2 text-[0.8rem] font-medium text-navy-900 hover:border-royal/40">
              Editar
            </Link>
          )
        }
      />

      {podeEditar && vaga.situacao === "RASCUNHO" && (
        <Secao titulo="Abrir a vaga">
          {falta.length ? (
            <p className="text-[0.83rem] text-amber-800">
              Para abrir, falta definir: <strong>{falta.join(", ")}</strong>. Regra 1 do processo — nenhuma vaga é divulgada antes disso.
            </p>
          ) : (
            <FormularioAcao acao={situacaoVagaAcao} botao="Abrir vaga" confirmar="Abrir a vaga? A partir daqui ela recebe inscrições e o ciclo de 12 dias começa a contar.">
              <input type="hidden" name="vaga_id" value={vaga.id} />
              <input type="hidden" name="para" value="ABERTA" />
              <div className="max-w-xs">
                <label htmlFor="aberta_em" className="rotulo-campo">
                  Dia 1 do ciclo (segunda-feira)
                </label>
                <input id="aberta_em" name="aberta_em" type="date" defaultValue={sugestaoAbertura} className="campo" />
              </div>
            </FormularioAcao>
          )}
        </Secao>
      )}

      {podeEditar && vaga.situacao !== "RASCUNHO" && (
        <div className="flex flex-wrap gap-2">
          {vaga.situacao === "ABERTA" && botaoSituacao("PAUSADA", "Pausar inscrições")}
          {vaga.situacao === "PAUSADA" && botaoSituacao("ABERTA", "Reabrir inscrições")}
          {vaga.situacao !== "ENCERRADA" &&
            botaoSituacao("ENCERRADA", "Encerrar vaga", "Encerrar a vaga? Ela para de receber inscrições e sai do painel. Os candidatos continuam no banco de currículos.")}
          {vaga.situacao === "ENCERRADA" && botaoSituacao("ABERTA", "Reabrir vaga")}
        </div>
      )}

      {vaga.aberta_em && (
        <Secao titulo="Ciclo de 12 dias">
          <CicloVaga abertaEm={vaga.aberta_em} candidaturas={cs} />
        </Secao>
      )}

      <Secao titulo="Candidatos por etapa">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {FUNIL.map((etapa) => {
            const daEtapa = cs.filter((c) => c.etapa === etapa);
            return (
              <div key={etapa} className="rounded-lg bg-background p-2.5">
                <p className="mb-2 flex items-center justify-between text-[0.72rem] font-semibold text-navy-900">
                  {ETAPAS[etapa].rotulo}
                  <span className="tabular-nums text-tenue">{daEtapa.length}</span>
                </p>
                <div className="space-y-2">
                  {daEtapa.map((c) => {
                    const p = candidato.get(c.candidato_id)!;
                    const parado = diasNaEtapa(banco, c);
                    return (
                      <Link
                        key={c.id}
                        href={`${BASE}/candidaturas/${c.id}?origem=vaga`}
                        className="block rounded-md border border-linha bg-superficie px-2.5 py-2 text-[0.78rem] hover:border-royal/40"
                      >
                        <span className="block font-medium text-navy-900">{p.nome}</span>
                        <span className="block text-[0.7rem] text-tenue">
                          {c.triagem && `Triagem ${c.triagem.nota_geral.toLocaleString("pt-BR")} · `}
                          {c.etapa === "ENTREVISTA_AGENDADA" && c.entrevista
                            ? momento(c.entrevista.data_hora)
                            : c.etapa === "ADMISSAO" && c.data_inicio
                              ? `Início ${diaLongo(c.data_inicio)}`
                              : parado > 0
                                ? `há ${parado} dia(s) nesta etapa`
                                : `desde hoje`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-linha pt-3 text-[0.78rem] text-tenue">
          <span className="font-medium text-navy-900">Encerradas:</span>
          {ENCERRADAS.map((e) => (
            <span key={e}>
              {ETAPAS[e].rotulo}: {cs.filter((c) => c.etapa === e).length}
            </span>
          ))}
          <Link href={`${BASE}/candidatos?vaga=${vaga.id}&situacao=todas`} className="ml-auto text-royal-vivo hover:underline">
            Ver todos em lista
          </Link>
        </div>
      </Secao>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Secao titulo="Descrição">
          <dl className="grid gap-3 text-[0.83rem] sm:grid-cols-2">
            {detalhes.map(([k, v]) => (
              <div key={k}>
                <dt className="rotulo-campo">{k}</dt>
                <dd className={v ? "text-navy-900" : "text-amber-800"}>{v || "não definido"}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="rotulo-campo">Atribuições</dt>
              <dd className="whitespace-pre-line text-navy-900">{vaga.atribuicoes || "não definido"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="rotulo-campo">Requisitos</dt>
              <dd className="whitespace-pre-line text-navy-900">{vaga.requisitos || "—"}</dd>
            </div>
          </dl>
        </Secao>
        <Secao titulo="Landing page">
          <p className="text-[0.8rem] text-tenue">
            O formulário da landing page manda as inscrições para o endereço abaixo, com o código da vaga. A landing page
            em si é outro projeto (subdomínio da MGCON, fora do site).
          </p>
          <p className="mt-2 text-[0.75rem] text-tenue">Código da vaga</p>
          <code className="mt-0.5 block break-all rounded-md bg-background px-2 py-1.5 text-[0.75rem] text-navy-900">{vaga.slug}</code>
          <p className="mt-2 text-[0.75rem] text-tenue">Endereço para envio</p>
          <code className="mt-0.5 block break-all rounded-md bg-background px-2 py-1.5 text-[0.75rem] text-navy-900">
            POST /api/recrutamento/inscricao
          </code>
          <p className="mt-2 text-[0.72rem] text-tenue">
            Situação para a landing page: {vaga.situacao === "ABERTA" ? "recebendo inscrições" : "não recebe inscrições"}.
            Criada em {diaLongo(diaDe(vaga.criado_em))} por {vaga.criado_por}.
          </p>
        </Secao>
      </div>
    </div>
  );
}
