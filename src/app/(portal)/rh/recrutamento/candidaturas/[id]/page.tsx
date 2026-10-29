import Link from "next/link";
import { notFound } from "next/navigation";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import Historico from "@/components/recrutamento/historico";
import { Etiqueta, linkWhatsApp, Secao, Voltar } from "@/components/recrutamento/pecas";
import { diasNaEtapa, historico } from "@/lib/recrutamento/consultas";
import { diaDe, diaLongo, hoje, momento, nomeDoDia, proximaSegunda, separarDiaHora, somarDias } from "@/lib/recrutamento/datas";
import { avisoFeriado, sugestaoInicio as calcularSugestao } from "@/lib/recrutamento/regras";
import { lerBanco } from "@/lib/recrutamento/dados";
import { CANAIS, CRITERIOS_ENTREVISTA, CRITERIOS_TRIAGEM, DADOS_FICHA, ETAPAS, FUNIL, MODELOS_EMAIL, RESULTADOS_CONTATO, SITUACOES_EMAIL } from "@/lib/recrutamento/opcoes";
import { acoesDaEtapa } from "@/lib/recrutamento/regras";
import { obterSessao } from "@/lib/recrutamento/sessao";
import Copiar from "./copiar";
import {
  PassoAvaliacao,
  PassoConfirmacao,
  PassoContato,
  PassoDecisao,
  PassoDesfazer,
  PassoDesistencia,
  PassoNaoCompareceu,
  PassoRemarcar,
  PassoTriagem,
} from "./passos";

const BASE = "/rh/recrutamento";

/** De onde a ficha foi aberta define o "voltar" (padrão das telas do Polaris). */
const ORIGENS_VOLTAR: Record<string, [string, string]> = {
  painel: [BASE, "o Painel"],
  candidatos: [`${BASE}/candidatos`, "o Banco de currículos"],
  entrevistas: [`${BASE}/entrevistas`, "Entrevistas"],
};

/** Primeira semana do admitido, como está no documento "Novo processo de contratação". */
const PRIMEIRA_SEMANA = [
  ["Segunda", "Começo"],
  ["Segunda a quarta", "Treinamento (3 dias)"],
  ["Quinta", "Linha (operação)"],
  ["Sexta", "Banco e exame"],
];
const RESPONSAVEIS_ADMISSAO = [
  ["Exame", "Marco"],
  ["Banco", "Leonardo"],
  ["Caju", "Leo"],
  ["Convert, 3C Plus e e-mail", "Larissa"],
  ["PA e acessórios", "Luana Sousa"],
];

export default async function Candidatura({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origem?: string }>;
}) {
  const { id } = await params;
  const { origem } = await searchParams;
  const banco = await lerBanco();
  const c = banco.candidaturas.find((x) => x.id === id);
  if (!c) notFound();
  const pessoa = banco.candidatos.find((x) => x.id === c.candidato_id)!;
  const vaga = banco.vagas.find((x) => x.id === c.vaga_id)!;
  const sessao = await obterSessao();
  const podeEditar = sessao.pode("recrutamento", "editar");
  const podeDecidir = sessao.pode("recrutamento_decidir", "criar");

  const etapa = ETAPAS[c.etapa];
  const acoes = podeEditar || podeDecidir ? acoesDaEtapa(c.etapa) : [];
  const contatos = banco.contatos.filter((x) => x.candidatura_id === c.id).sort((a, b) => b.em.localeCompare(a.em));
  const emails = banco.emails.filter((e) => e.candidatura_id === c.id).sort((a, b) => b.agendado_para.localeCompare(a.agendado_para));
  const parado = diasNaEtapa(banco, c);
  const [voltarHref, voltarPara] =
    origem === "vaga" || origem === "candidato"
      ? origem === "vaga"
        ? [`${BASE}/vagas/${vaga.id}`, vaga.titulo]
        : [`${BASE}/candidatos/${pessoa.id}`, pessoa.nome]
      : (ORIGENS_VOLTAR[origem ?? ""] ?? [`${BASE}/candidatos`, "o Banco de currículos"]);

  const padraoEntrevista = {
    dia: somarDias(hoje(), 1),
    entrevistadores: c.entrevista?.entrevistadores ?? "Leonardo Okubo, Rogerio Okubo",
    supervisora: c.entrevista?.supervisora ?? "",
  };
  const sugestaoInicio = calcularSugestao(hoje());
  const feriadoProximaSegunda = avisoFeriado(proximaSegunda(hoje()));
  const ehNegativa = (m: string) => m === "REPROVADO_TRIAGEM" || m === "REPROVADO_ENTREVISTA";

  const mensagemAprovacao = [
    `Olá, ${pessoa.nome.split(" ")[0]}! Tudo bem?`,
    "",
    `Aqui é o(a) ${sessao.nome.split(" ")[0]}, da ${vaga.empresa === "MGCON" ? "MGCON" : "Okubo Consórcio"}. Passando para te dar uma ótima notícia: você foi *aprovado(a)* no nosso processo seletivo para a vaga de ${vaga.titulo}!`,
    "",
    `Próximos passos — Início: ${diaLongo(sugestaoInicio)}, às [HORÁRIO]. Local: ${banco.config.endereco_entrevista}.`,
    "",
    "Por favor, me confirma por aqui se está tudo certo para você até o fim do dia de hoje.",
    "",
    "Qualquer dúvida, é só chamar. Bem-vindo(a) ao time!",
  ].join("\n");

  const indiceAtual = FUNIL.indexOf(etapa.encerrada ? (c.etapa_encerramento ?? "INSCRITO") : c.etapa);

  return (
    <div className="surge space-y-6">
      <Voltar href={voltarHref} para={voltarPara} />
      <CabecalhoPagina
        bloco={`${vaga.titulo} · ${vaga.empresa}`}
        titulo={pessoa.nome}
        resumo={
          <span className="flex flex-wrap items-center gap-2">
            <Etiqueta cor={etapa.cor}>{etapa.rotulo}</Etiqueta>
            {etapa.encerrada
              ? `${c.motivo_encerramento || "sem motivo registrado"} · estava em "${ETAPAS[c.etapa_encerramento ?? "INSCRITO"].rotulo}"`
              : `${etapa.aguardando}${parado > 0 && c.etapa !== "ADMISSAO" ? ` · há ${parado} dia(s)` : ""}`}
          </span>
        }
        acoes={
          <Link href={`${BASE}/candidatos/${pessoa.id}`} className="rounded-[9px] border border-linha bg-superficie px-3.5 py-2 text-[0.8rem] font-medium text-navy-900 hover:border-royal/40">
            Ficha completa
          </Link>
        }
      />

      {/* Onde está no caminho. Encerradas mostram até onde chegaram, em cinza. */}
      <ol className="flex flex-wrap gap-1.5">
        {FUNIL.map((e, i) => (
          <li
            key={e}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.72rem] font-medium ${
              i < indiceAtual
                ? "bg-royal/10 text-royal"
                : i === indiceAtual
                  ? etapa.encerrada
                    ? "bg-gray-200 text-gray-700 line-through"
                    : "bg-royal-vivo text-white"
                  : "border border-dashed border-linha text-tenue"
            }`}
          >
            <span className="tabular-nums opacity-70">{i + 1}</span> {ETAPAS[e].rotulo}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {acoes.length > 0 && (
            <Secao titulo="Próximo passo" className="ring-1 ring-royal-vivo/25">
              <div className="space-y-5">
                {acoes.includes("triagem") && <PassoTriagem c={c} config={banco.config} />}
                {acoes.includes("contato") && <PassoContato c={c} padrao={padraoEntrevista} />}
                {acoes.includes("avaliacao") && (
                  <PassoAvaliacao
                    c={c}
                    horario={vaga.horario}
                    bairroCidade={[pessoa.bairro, pessoa.cidade].filter(Boolean).join(", ")}
                  />
                )}
                {acoes.includes("decisao") && <PassoDecisao c={c} podeDecidir={podeDecidir} config={banco.config} />}
                {acoes.includes("confirmacao") && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-background p-3">
                      <p className="mb-2 text-[0.78rem] text-tenue">
                        Mensagem padrão de aprovação pelo WhatsApp (o horário fica para você completar). O candidato confirma
                        até o fim do dia.
                      </p>
                      <pre className="whitespace-pre-wrap font-sans text-[0.8rem] text-navy-900">{mensagemAprovacao}</pre>
                      <div className="mt-3 flex gap-2">
                        <Copiar texto={mensagemAprovacao} />
                        <a href={linkWhatsApp(pessoa.telefone, mensagemAprovacao)} target="_blank" rel="noreferrer" className="rounded-[9px] bg-green-600 px-3 py-1.5 text-[0.78rem] font-medium text-white hover:bg-green-700">
                          Abrir no WhatsApp
                        </a>
                      </div>
                    </div>
                    {feriadoProximaSegunda && (
                      <p className="text-[0.78rem] text-amber-800">
                        Atenção: a próxima segunda, {feriadoProximaSegunda} A data sugerida passa para o dia útil
                        seguinte ({nomeDoDia(sugestaoInicio)}). Avise o RH para ajustar a primeira semana.
                      </p>
                    )}
                    <PassoConfirmacao c={c} sugestao={sugestaoInicio} />
                  </div>
                )}
                {acoes.includes("desfazer") && (
                  <PassoDesfazer
                    c={c}
                    negativaPendente={emails.some((e) => ehNegativa(e.modelo) && e.situacao === "PENDENTE")}
                    negativaEnviada={emails.some((e) => ehNegativa(e.modelo) && e.situacao === "ENVIADO")}
                  />
                )}
              </div>

              {(acoes.includes("remarcar") || acoes.includes("nao_compareceu") || acoes.includes("desistiu")) && (
                <div className="mt-5 space-y-2 border-t border-linha pt-4">
                  {acoes.includes("remarcar") && c.entrevista && (
                    <details>
                      <summary className="cursor-pointer text-[0.8rem] font-medium text-royal-vivo">Remarcar a entrevista</summary>
                      <div className="mt-3">
                        <PassoRemarcar
                          c={c}
                          padrao={{ ...separarDiaHora(c.entrevista.data_hora), local: c.entrevista.local, entrevistadores: c.entrevista.entrevistadores, supervisora: c.entrevista.supervisora }}
                        />
                      </div>
                    </details>
                  )}
                  {acoes.includes("nao_compareceu") && (
                    <details>
                      <summary className="cursor-pointer text-[0.8rem] font-medium text-royal-vivo">Não compareceu</summary>
                      <div className="mt-3">
                        <PassoNaoCompareceu c={c} />
                      </div>
                    </details>
                  )}
                  {acoes.includes("desistiu") && (
                    <details>
                      <summary className="cursor-pointer text-[0.8rem] font-medium text-royal-vivo">O candidato desistiu</summary>
                      <div className="mt-3">
                        <PassoDesistencia c={c} />
                      </div>
                    </details>
                  )}
                </div>
              )}
            </Secao>
          )}

          {c.etapa === "ADMISSAO" && (
            <Secao titulo="Admissão">
              <p className="text-[0.83rem] text-navy-900">
                Início em <strong>{c.data_inicio && `${nomeDoDia(c.data_inicio)}, ${diaLongo(c.data_inicio)}`}</strong>. Encaminhado ao
                RH — <strong>Marco Aurelio</strong> conduz a partir daqui.
              </p>
              <p className="mt-1 text-[0.75rem] text-tenue">
                No Polaris, este passo abre o processo de Admissão em Gestão de Pessoas › Admissões e desligamentos, que já
                tem as tarefas por fase. A lista abaixo é a do documento do processo, para conferência.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <table className="text-[0.8rem]">
                  <tbody className="divide-y divide-linha">
                    {PRIMEIRA_SEMANA.map(([d, o]) => (
                      <tr key={d}>
                        <td className="py-1.5 pr-3 text-tenue">{d}</td>
                        <td className="py-1.5 text-navy-900">{o}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table className="text-[0.8rem]">
                  <tbody className="divide-y divide-linha">
                    {RESPONSAVEIS_ADMISSAO.map(([o, q]) => (
                      <tr key={o}>
                        <td className="py-1.5 pr-3 text-tenue">{o}</td>
                        <td className="py-1.5 text-navy-900">{q}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Secao>
          )}

          {c.triagem && (
            <Secao titulo={`Triagem · nota ${c.triagem.nota_geral.toLocaleString("pt-BR")}`}>
              <div className="grid gap-x-6 gap-y-1.5 text-[0.8rem] sm:grid-cols-2">
                {CRITERIOS_TRIAGEM.map((k) => (
                  <p key={k.chave} className="flex justify-between gap-2">
                    <span className="text-tenue">{k.rotulo}</span>
                    <span className="tabular-nums text-navy-900">{c.triagem!.notas[k.chave]}</span>
                  </p>
                ))}
              </div>
              {c.triagem.comentario && <p className="mt-2 text-[0.8rem] text-navy-900">{c.triagem.comentario}</p>}
              <p className="mt-2 text-[0.72rem] text-tenue">
                {c.triagem.por} · {momento(c.triagem.em)}
              </p>
            </Secao>
          )}

          {contatos.length > 0 && (
            <Secao titulo={`Contatos (${contatos.length})`}>
              <ul className="divide-y divide-linha">
                {contatos.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[0.8rem]">
                    <span>
                      <Etiqueta cor={RESULTADOS_CONTATO[k.resultado].cor}>{RESULTADOS_CONTATO[k.resultado].rotulo}</Etiqueta>
                      <span className="ml-2 text-tenue">{CANAIS[k.canal]}</span>
                      {k.observacao && <span className="ml-2 text-navy-900">{k.observacao}</span>}
                    </span>
                    <span className="text-[0.72rem] text-tenue">
                      {k.por} · {momento(k.em)}
                    </span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {c.entrevista && (
            <Secao titulo="Entrevista">
              <dl className="grid gap-3 text-[0.8rem] sm:grid-cols-2">
                <div>
                  <dt className="rotulo-campo">Quando</dt>
                  <dd className="text-navy-900">
                    {nomeDoDia(diaDe(c.entrevista.data_hora))}, {momento(c.entrevista.data_hora)}
                    {c.entrevista.remarcacoes > 0 && <span className="text-amber-800"> · remarcada {c.entrevista.remarcacoes}x</span>}
                  </dd>
                </div>
                <div>
                  <dt className="rotulo-campo">Local</dt>
                  <dd className="text-navy-900">{c.entrevista.local}</dd>
                </div>
                <div>
                  <dt className="rotulo-campo">Entrevistadores</dt>
                  <dd className="text-navy-900">{c.entrevista.entrevistadores || "—"}</dd>
                </div>
                <div>
                  <dt className="rotulo-campo">Supervisora</dt>
                  <dd className="text-navy-900">{c.entrevista.supervisora || "—"}</dd>
                </div>
              </dl>
            </Secao>
          )}

          {c.avaliacao && (
            <Secao titulo={`Avaliação da entrevista · parecer ${c.avaliacao.parecer.toLowerCase()}`}>
              <dl className="mb-4 grid gap-x-4 gap-y-2 text-[0.8rem] sm:grid-cols-2">
                {DADOS_FICHA.map((d) => {
                  const r = c.avaliacao!.dados[d.chave];
                  const valor = d.tipo === "simnao" ? { SIM: "Sim", NAO: "Não" }[r?.valor ?? ""] : r?.valor;
                  return (
                    <div key={d.chave}>
                      <dt className="rotulo-campo">{d.rotulo}</dt>
                      <dd className="text-navy-900">{[valor, r?.detalhe].filter(Boolean).join(" — ") || "—"}</dd>
                    </div>
                  );
                })}
              </dl>
              <table className="w-full text-[0.8rem]">
                <tbody className="divide-y divide-linha">
                  {CRITERIOS_ENTREVISTA.map((k) => (
                    <tr key={k.chave}>
                      <td className="py-1.5 pr-3 text-tenue">{k.rotulo}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-navy-900">{c.avaliacao!.notas[k.chave]?.nota}</td>
                      <td className="py-1.5 text-navy-900">{c.avaliacao!.notas[k.chave]?.justificativa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 grid gap-3 text-[0.8rem] sm:grid-cols-2">
                {(
                  [
                    ["Pontos positivos", c.avaliacao.pontos_positivos],
                    ["Pontos de atenção", c.avaliacao.pontos_atencao],
                  ] as const
                ).map(([titulo, pontos]) => (
                  <div key={titulo}>
                    <span className="rotulo-campo">{titulo}</span>
                    <ol className="list-decimal space-y-0.5 pl-4">
                      {pontos.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ol>
                  </div>
                ))}
                <p>
                  <span className="rotulo-campo">Realizada por</span>
                  {c.avaliacao.realizada_por.join(", ")} · nota geral {c.avaliacao.nota_entrevistador}
                </p>
                <p>
                  <span className="rotulo-campo">Supervisora</span>
                  {c.avaliacao.supervisora
                    ? `${c.avaliacao.supervisora} · nota ${c.avaliacao.nota_supervisora}`
                    : "não participou"}
                </p>
                <p>
                  <span className="rotulo-campo">Ficha escaneada</span>
                  {c.avaliacao.ficha ? (
                    <a href={`${BASE}/arquivos/${c.avaliacao.ficha.id}`} target="_blank" className="text-royal-vivo hover:underline">
                      {c.avaliacao.ficha.nome}
                    </a>
                  ) : (
                    <span className="text-amber-800">não anexada</span>
                  )}
                </p>
              </div>
              <p className="mt-2 text-[0.72rem] text-tenue">
                Registrado por {c.avaliacao.por} · {momento(c.avaliacao.em)}
              </p>
            </Secao>
          )}

          {c.decisao && (
            <Secao titulo="Decisão">
              <p className="text-[0.83rem] text-navy-900">
                <strong>{c.decisao.resultado === "APROVADO" ? "Aprovado" : c.decisao.resultado === "RESERVA" ? "Reserva" : "Reprovado"}</strong> por{" "}
                {c.decisao.quem_decidiu}.{c.decisao.comentario && ` ${c.decisao.comentario}`}
              </p>
              <p className="mt-1 text-[0.72rem] text-tenue">
                Registrado por {c.decisao.por} · {momento(c.decisao.em)}
              </p>
            </Secao>
          )}
        </div>

        <div className="space-y-6">
          <Secao titulo="Contato">
            <dl className="space-y-2 text-[0.83rem]">
              <div>
                <dt className="rotulo-campo">Telefone</dt>
                <dd className="flex items-center gap-2 text-navy-900">
                  {pessoa.telefone}
                  <a href={linkWhatsApp(pessoa.telefone)} target="_blank" rel="noreferrer" className="text-[0.75rem] text-green-700 hover:underline">
                    WhatsApp
                  </a>
                </dd>
              </div>
              <div>
                <dt className="rotulo-campo">E-mail</dt>
                <dd className="break-all text-navy-900">{pessoa.email}</dd>
              </div>
              <div>
                <dt className="rotulo-campo">Bairro · origem</dt>
                <dd className="text-navy-900">
                  {[pessoa.bairro, pessoa.cidade].filter(Boolean).join(", ") || "—"} · {pessoa.origem}
                </dd>
              </div>
              <div>
                <dt className="rotulo-campo">Experiência</dt>
                <dd className="text-navy-900">{pessoa.resumo || "—"}</dd>
              </div>
              <div>
                <dt className="rotulo-campo">Currículo</dt>
                <dd>
                  {pessoa.curriculo ? (
                    <a href={`${BASE}/arquivos/${pessoa.curriculo.id}`} target="_blank" className="text-royal-vivo hover:underline">
                      {pessoa.curriculo.nome}
                    </a>
                  ) : (
                    <span className="text-tenue">não anexado</span>
                  )}
                </dd>
              </div>
            </dl>
          </Secao>

          <Secao titulo="E-mails ao candidato">
            {emails.length === 0 ? (
              <p className="text-[0.8rem] text-tenue">Nenhum.</p>
            ) : (
              <ul className="space-y-2">
                {emails.map((e) => (
                  <li key={e.id} className="text-[0.78rem]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-navy-900">{MODELOS_EMAIL[e.modelo].rotulo}</span>
                      <Etiqueta cor={SITUACOES_EMAIL[e.situacao].cor}>{SITUACOES_EMAIL[e.situacao].rotulo}</Etiqueta>
                    </div>
                    <p className="text-[0.7rem] text-tenue">
                      {e.situacao === "ENVIADO" && e.enviado_em
                        ? `saiu ${momento(e.enviado_em)}`
                        : e.situacao === "PENDENTE"
                          ? `sai ${momento(e.agendado_para)}`
                          : e.motivo}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Histórico">
            <Historico eventos={historico(banco, { candidatura: c.id })} />
          </Secao>
        </div>
      </div>
    </div>
  );
}
