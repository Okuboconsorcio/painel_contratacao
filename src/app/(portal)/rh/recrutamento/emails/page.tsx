import Link from "next/link";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import FormularioAcao from "@/components/recrutamento/formulario-acao";
import { Etiqueta, Secao, Vazio } from "@/components/recrutamento/pecas";
import { momento } from "@/lib/recrutamento/datas";
import { lerBanco } from "@/lib/recrutamento/dados";
import { envioLigado } from "@/lib/recrutamento/envio";
import { MODELOS_EMAIL, SITUACOES_EMAIL } from "@/lib/recrutamento/opcoes";
import { obterSessao } from "@/lib/recrutamento/sessao";
import type { ModeloEmail, SituacaoEmail } from "@/lib/recrutamento/tipos";
import { configAcao, processarFilaAcao } from "../actions";

const BASE = "/rh/recrutamento";
const ABAS: [SituacaoEmail | "TODOS", string][] = [
  ["PENDENTE", "Agendados"],
  ["ENVIADO", "Enviados"],
  ["CANCELADO", "Cancelados"],
  ["TODOS", "Todos"],
];

export default async function Emails({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba = "PENDENTE" } = await searchParams;
  const banco = await lerBanco();
  const sessao = await obterSessao();
  const nomes = new Map(banco.candidatos.map((c) => [c.id, c.nome]));
  const lista = banco.emails
    .filter((e) => aba === "TODOS" || e.situacao === aba)
    .sort((a, b) => (aba === "PENDENTE" ? a.agendado_para.localeCompare(b.agendado_para) : b.agendado_para.localeCompare(a.agendado_para)));
  const cfg = banco.config;

  return (
    <div className="surge space-y-6">
      <CabecalhoPagina
        bloco="Recrutamento"
        titulo="E-mails aos candidatos"
        resumo={`Tudo o que o sistema manda sozinho, na hora marcada.${sessao.real ? "" : " No protótipo o envio é simulado."}`}
        acoes={<FormularioAcao acao={processarFilaAcao} botao="Enviar o que já está na hora" variante="secundario" />}
      />

      {!envioLigado() && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[0.8rem] text-amber-900">
          <strong>O envio de e-mail ainda não está ligado no servidor.</strong> Os e-mails ficam agendados e saem quando
          a senha do e-mail for configurada na Vercel — nenhum se perde.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {ABAS.map(([valor, rotulo]) => {
          const n = valor === "TODOS" ? banco.emails.length : banco.emails.filter((e) => e.situacao === valor).length;
          return (
            <Link
              key={valor}
              href={`${BASE}/emails?aba=${valor}`}
              className={`rounded-full px-3 py-1 text-[0.78rem] font-medium ${aba === valor ? "bg-royal-vivo text-white" : "border border-linha bg-superficie text-navy-900 hover:border-royal/40"}`}
            >
              {rotulo} <span className="tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <Vazio>Nenhum e-mail nesta aba.</Vazio>
      ) : (
        <div className="painel divide-y divide-linha">
          {lista.map((e) => (
            <details key={e.id} className="group px-4 py-3">
              <summary className="grid cursor-pointer list-none gap-2 text-[0.8rem] sm:grid-cols-[9.5rem_1fr_auto] sm:items-center">
                <span className="text-tenue">{momento(e.situacao === "ENVIADO" && e.enviado_em ? e.enviado_em : e.agendado_para)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-navy-900">{e.assunto}</span>
                  <span className="block truncate text-[0.72rem] text-tenue">
                    {MODELOS_EMAIL[e.modelo].rotulo} · {nomes.get(e.candidato_id)} · para {e.para.join(", ") || "ninguém"}
                  </span>
                </span>
                <Etiqueta cor={SITUACOES_EMAIL[e.situacao].cor}>{SITUACOES_EMAIL[e.situacao].rotulo}</Etiqueta>
              </summary>
              <div className="mt-3 rounded-lg bg-background p-4 text-[0.83rem] text-navy-900">
                {e.linhas.map((l, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {l}
                  </p>
                ))}
                <p className="mt-3 border-t border-linha pt-2 text-[0.72rem] text-tenue">
                  De {cfg.remetente} · agendado para {momento(e.agendado_para)}
                  {e.motivo && ` · ${e.motivo}`}
                  {e.candidatura_id && (
                    <>
                      {" · "}
                      <Link href={`${BASE}/candidaturas/${e.candidatura_id}`} className="text-royal-vivo hover:underline">
                        abrir candidatura
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </details>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Quando cada e-mail sai">
          <table className="w-full text-[0.8rem]">
            <tbody className="divide-y divide-linha">
              {(Object.keys(MODELOS_EMAIL) as ModeloEmail[]).map((m) => (
                <tr key={m} className={cfg.emails_ligados.includes(m) ? "" : "opacity-55"}>
                  <td className="py-2 pr-3 font-medium text-navy-900">{MODELOS_EMAIL[m].rotulo}</td>
                  <td className="py-2 pr-3 text-tenue">{MODELOS_EMAIL[m].quando}</td>
                  <td className="py-2 text-right">
                    {cfg.emails_ligados.includes(m) ? <Etiqueta cor="verde">ligado</Etiqueta> : <Etiqueta cor="neutro">desligado</Etiqueta>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[0.75rem] text-tenue">
            Mudou a etapa antes de o e-mail sair (desfez uma reprovação, remarcou a entrevista, o candidato desistiu)? O
            e-mail pendente é cancelado sozinho.
          </p>
        </Secao>

        <Secao titulo="Configuração">
          {sessao.pode("recrutamento_config", "editar") ? (
            <FormularioAcao acao={configAcao} botao="Salvar configuração">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="remetente" className="rotulo-campo">
                    Remetente
                  </label>
                  <input id="remetente" name="remetente" defaultValue={cfg.remetente} className="campo" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="emails_master" className="rotulo-campo">
                    E-mails dos master (recebem o lembrete das entrevistas)
                  </label>
                  <input id="emails_master" name="emails_master" defaultValue={cfg.emails_master.join(", ")} className="campo" />
                </div>
                <div>
                  <label htmlFor="dias_espera_negativa" className="rotulo-campo">
                    Dias de espera da negativa
                  </label>
                  <input id="dias_espera_negativa" name="dias_espera_negativa" type="number" min={0} max={10} defaultValue={cfg.dias_espera_negativa} className="campo" />
                </div>
                <div>
                  <label htmlFor="hora_lembrete" className="rotulo-campo">
                    Hora do lembrete (véspera)
                  </label>
                  <input id="hora_lembrete" name="hora_lembrete" type="time" defaultValue={cfg.hora_lembrete} className="campo" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="endereco_entrevista" className="rotulo-campo">
                    Endereço padrão da entrevista
                  </label>
                  <input id="endereco_entrevista" name="endereco_entrevista" defaultValue={cfg.endereco_entrevista} className="campo" />
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className="rotulo-campo">E-mails ligados (desligado não entra na fila)</legend>
                  <div className="grid gap-1.5 text-[0.8rem] sm:grid-cols-2">
                    {(Object.keys(MODELOS_EMAIL) as ModeloEmail[]).map((m) => (
                      <label key={m} className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" name="emails_ligados" value={m} defaultChecked={cfg.emails_ligados.includes(m)} />
                        {MODELOS_EMAIL[m].rotulo}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="meses_guarda" className="rotulo-campo">
                    Guarda dos currículos não contratados (meses, LGPD)
                  </label>
                  <input id="meses_guarda" name="meses_guarda" type="number" min={1} max={60} defaultValue={cfg.meses_guarda} className="campo" />
                </div>
              </div>
            </FormularioAcao>
          ) : (
            <dl className="space-y-1.5 text-[0.8rem]">
              <p>Negativa: {cfg.dias_espera_negativa} dia(s) depois · lembrete às {cfg.hora_lembrete} da véspera.</p>
              <p className="text-tenue">Só o master altera a configuração.</p>
            </dl>
          )}
        </Secao>
      </div>
    </div>
  );
}
