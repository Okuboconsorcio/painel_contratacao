import Link from "next/link";
import { notFound } from "next/navigation";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import FormularioAcao from "@/components/recrutamento/formulario-acao";
import Historico from "@/components/recrutamento/historico";
import { Etiqueta, linkWhatsApp, Secao, Voltar } from "@/components/recrutamento/pecas";
import { historico } from "@/lib/recrutamento/consultas";
import { diaDe, diaLongo, hoje, momento } from "@/lib/recrutamento/datas";
import { guardarAte } from "@/lib/recrutamento/regras";
import { lerBanco } from "@/lib/recrutamento/dados";
import { ETAPAS } from "@/lib/recrutamento/opcoes";
import { obterSessao } from "@/lib/recrutamento/sessao";
import { editarCandidatoAcao, inscreverEmVagaAcao } from "../../actions";
import CamposCandidato from "../campos-candidato";

const BASE = "/rh/recrutamento";

export default async function FichaCandidato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banco = await lerBanco();
  const pessoa = banco.candidatos.find((c) => c.id === id);
  if (!pessoa) notFound();
  const sessao = await obterSessao();

  const vagas = new Map(banco.vagas.map((v) => [v.id, v]));
  const candidaturas = banco.candidaturas
    .filter((c) => c.candidato_id === pessoa.id)
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const guarda = guardarAte(pessoa.consentimento_em, candidaturas, banco.config.meses_guarda);
  const ativasNaVaga = new Set(candidaturas.filter((c) => !ETAPAS[c.etapa].encerrada).map((c) => c.vaga_id));
  const vagasParaInscrever = banco.vagas.filter((v) => v.situacao !== "ENCERRADA" && !ativasNaVaga.has(v.id));
  const eventos = historico(banco, { candidato: pessoa.id }).map((e) => ({
    ...e,
    vaga: e.candidatura_id ? vagas.get(banco.candidaturas.find((c) => c.id === e.candidatura_id)?.vaga_id ?? "")?.titulo : undefined,
  }));

  return (
    <div className="surge space-y-6">
      <Voltar href={`${BASE}/candidatos`} para="Banco de currículos" />
      <CabecalhoPagina
        bloco="Banco de currículos"
        titulo={pessoa.nome}
        resumo={`${pessoa.origem} · no banco desde ${diaLongo(diaDe(pessoa.criado_em))} · ${candidaturas.length} candidatura(s)`}
        acoes={
          <a href={linkWhatsApp(pessoa.telefone)} target="_blank" rel="noreferrer" className="rounded-[9px] border border-linha bg-superficie px-3.5 py-2 text-[0.8rem] font-medium text-navy-900 hover:border-royal/40">
            Abrir WhatsApp
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Secao titulo="Candidaturas">
            <ul className="divide-y divide-linha">
              {candidaturas.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link href={`${BASE}/candidaturas/${c.id}?origem=candidato`} className="font-medium text-navy-900 hover:text-royal-vivo">
                    {vagas.get(c.vaga_id)?.titulo}
                    <span className="ml-2 text-[0.75rem] font-normal text-tenue">inscrito em {momento(c.criado_em)}</span>
                  </Link>
                  <span className="flex items-center gap-2">
                    {c.triagem && <span className="text-[0.75rem] text-tenue">triagem {c.triagem.nota_geral.toLocaleString("pt-BR")}</span>}
                    <Etiqueta cor={ETAPAS[c.etapa].cor}>{ETAPAS[c.etapa].rotulo}</Etiqueta>
                  </span>
                </li>
              ))}
            </ul>
            {sessao.pode("recrutamento", "criar") && vagasParaInscrever.length > 0 && (
              <FormularioAcao acao={inscreverEmVagaAcao} botao="Inscrever nesta vaga" variante="secundario" className="mt-3 border-t border-linha pt-3">
                <input type="hidden" name="candidato_id" value={pessoa.id} />
                <label htmlFor="vaga_id" className="rotulo-campo">
                  Chamar para outra vaga (reaproveitar do banco)
                </label>
                <select id="vaga_id" name="vaga_id" className="campo max-w-md">
                  {vagasParaInscrever.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.titulo} · {v.empresa} ({v.situacao.toLowerCase()})
                    </option>
                  ))}
                </select>
              </FormularioAcao>
            )}
          </Secao>

          {sessao.pode("recrutamento", "editar") && (
            <details className="painel group p-5">
              <summary className="sobrancelha cursor-pointer list-none text-royal/80">Editar ficha ▸</summary>
              <FormularioAcao acao={editarCandidatoAcao} botao="Salvar ficha" className="mt-4">
                <input type="hidden" name="candidato_id" value={pessoa.id} />
                <CamposCandidato candidato={pessoa} />
              </FormularioAcao>
            </details>
          )}

          <Secao titulo="Histórico (todas as vagas)">
            <Historico eventos={eventos} mostrarVaga />
          </Secao>
        </div>

        <Secao titulo="Ficha" className="h-fit">
          <dl className="space-y-2.5 text-[0.83rem]">
            <Item rotulo="Telefone" valor={pessoa.telefone} />
            <Item rotulo="E-mail" valor={pessoa.email} />
            <Item rotulo="Cidade e bairro" valor={[pessoa.bairro, pessoa.cidade].filter(Boolean).join(", ")} />
            <Item rotulo="Nascimento" valor={pessoa.data_nascimento ? diaLongo(pessoa.data_nascimento) : ""} />
            <Item rotulo="Experiência" valor={pessoa.resumo} />
            <Item rotulo="Observações" valor={pessoa.observacoes} />
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
            <Item
              rotulo="Autorização LGPD"
              valor={pessoa.consentimento_em ? `dada em ${momento(pessoa.consentimento_em)}` : "sem autorização"}
            />
            <div>
              <dt className="rotulo-campo">Guardar até (LGPD)</dt>
              <dd className={guarda && guarda < hoje() ? "font-medium text-red-700" : "text-navy-900"}>
                {guarda === null
                  ? "contratado — os dados seguem com o RH"
                  : `${diaLongo(guarda)} — depois disso, apagado sozinho`}
              </dd>
            </div>
          </dl>
        </Secao>
      </div>
    </div>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="rotulo-campo">{rotulo}</dt>
      <dd className={valor ? "whitespace-pre-line text-navy-900" : "text-tenue"}>{valor || "—"}</dd>
    </div>
  );
}
