import Link from "next/link";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import { Etiqueta, Vazio } from "@/components/recrutamento/pecas";
import { diaDe, diaLongo, hoje, somarDias } from "@/lib/recrutamento/datas";
import { guardarAte } from "@/lib/recrutamento/regras";
import { lerBanco } from "@/lib/recrutamento/dados";
import { ETAPAS, ORIGENS } from "@/lib/recrutamento/opcoes";
import { obterSessao } from "@/lib/recrutamento/sessao";
import type { Etapa } from "@/lib/recrutamento/tipos";

const BASE = "/rh/recrutamento";

/** Tira acento e caixa para a busca achar "Letícia" digitando "leticia". */
const simples = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default async function BancoDeCurriculos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const f = await searchParams;
  const banco = await lerBanco();
  const sessao = await obterSessao();

  const busca = simples(f.q ?? "");
  const situacao = f.situacao ?? "todas";
  const vagas = new Map(banco.vagas.map((v) => [v.id, v]));

  const linhas = banco.candidatos
    .map((p) => ({
      pessoa: p,
      candidaturas: banco.candidaturas
        .filter((c) => c.candidato_id === p.id)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
    }))
    .filter(({ pessoa, candidaturas }) => {
      if (busca) {
        const texto = simples(`${pessoa.nome} ${pessoa.email} ${pessoa.telefone} ${pessoa.cidade} ${pessoa.bairro} ${pessoa.resumo}`);
        const digitos = busca.replace(/\D/g, "");
        if (!texto.includes(busca) && !(digitos.length >= 4 && pessoa.telefone.replace(/\D/g, "").includes(digitos))) return false;
      }
      if (f.origem && pessoa.origem !== f.origem) return false;
      const relevantes = candidaturas.filter((c) => !f.vaga || c.vaga_id === f.vaga);
      if (f.vaga && !relevantes.length) return false;
      if (f.etapa && !relevantes.some((c) => c.etapa === f.etapa)) return false;
      if (situacao === "andamento" && !relevantes.some((c) => !ETAPAS[c.etapa].encerrada && c.etapa !== "ADMISSAO")) return false;
      if (situacao === "reserva" && !relevantes.some((c) => c.etapa === "RESERVA")) return false;
      // Vencido é apagado sozinho; o filtro mostra quem vai sumir em até 30 dias,
      // para dar tempo de chamar para outra vaga (o que renova o prazo).
      if (situacao === "lgpd") {
        const ate = guardarAte(pessoa.consentimento_em, candidaturas, banco.config.meses_guarda);
        if (!ate || ate > somarDias(hoje(), 30)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.candidaturas[0]?.criado_em ?? b.pessoa.criado_em).localeCompare(a.candidaturas[0]?.criado_em ?? a.pessoa.criado_em));

  const ultimaLimpeza = banco.limpezas_lgpd?.at(-1);
  const filtrando = Object.values(f).some(Boolean);
  const etapaFiltro = f.etapa as Etapa | undefined;

  return (
    <div className="surge space-y-5">
      <CabecalhoPagina
        bloco="Recrutamento"
        titulo="Banco de currículos"
        resumo={`${linhas.length} de ${banco.candidatos.length} pessoas${etapaFiltro && ETAPAS[etapaFiltro] ? ` · ${ETAPAS[etapaFiltro].aguardando.toLowerCase()}` : ""} · currículos de quem não foi contratado são apagados ${banco.config.meses_guarda} meses depois do último movimento${
          ultimaLimpeza ? ` (última limpeza: ${diaLongo(diaDe(ultimaLimpeza.em))}, ${ultimaLimpeza.candidatos} pessoa(s))` : ""
        }`}
        acoes={
          sessao.pode("recrutamento", "criar") && (
            <Link href={`${BASE}/candidatos/novo`} className="rounded-[9px] bg-royal-vivo px-3.5 py-2 text-[0.8rem] font-medium text-white hover:bg-royal">
              Cadastrar candidato
            </Link>
          )
        }
      />

      <form className="painel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="rotulo-campo">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={f.q} placeholder="Nome, e-mail, telefone, bairro, experiência…" className="campo" />
        </div>
        <div>
          <label htmlFor="vaga" className="rotulo-campo">
            Vaga
          </label>
          <select id="vaga" name="vaga" defaultValue={f.vaga ?? ""} className="campo">
            <option value="">Todas</option>
            {banco.vagas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.titulo} ({v.situacao.toLowerCase()})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="etapa" className="rotulo-campo">
            Etapa
          </label>
          <select id="etapa" name="etapa" defaultValue={f.etapa ?? ""} className="campo">
            <option value="">Todas</option>
            {(Object.keys(ETAPAS) as Etapa[]).map((e) => (
              <option key={e} value={e}>
                {ETAPAS[e].rotulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="origem" className="rotulo-campo">
            Origem
          </label>
          <select id="origem" name="origem" defaultValue={f.origem ?? ""} className="campo">
            <option value="">Todas</option>
            {ORIGENS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="situacao" className="rotulo-campo">
            Situação
          </label>
          <select id="situacao" name="situacao" defaultValue={situacao} className="campo">
            <option value="todas">Todas</option>
            <option value="andamento">Em andamento</option>
            <option value="reserva">Banco de reserva</option>
            <option value="lgpd">Apagados em até 30 dias (LGPD)</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <button className="rounded-[9px] bg-royal-vivo px-3.5 py-2 text-[0.8rem] font-medium text-white hover:bg-royal">Filtrar</button>
          {filtrando && (
            <Link href={`${BASE}/candidatos`} className="px-2 py-2 text-[0.8rem] text-tenue hover:text-royal-vivo">
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {linhas.length === 0 ? (
        <Vazio>Ninguém encontrado com esses filtros.</Vazio>
      ) : (
        <div className="painel overflow-x-auto">
          <table className="w-full text-[0.83rem]">
            <thead className="cabecalho-tabela border-b border-linha text-left">
              <tr>
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Bairro</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Vagas e etapa</th>
                <th className="px-4 py-3">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {linhas.map(({ pessoa, candidaturas }) => (
                <tr key={pessoa.id} className="align-top hover:bg-background">
                  <td className="px-4 py-3">
                    <Link href={`${BASE}/candidatos/${pessoa.id}`} className="font-medium text-navy-900 hover:text-royal-vivo">
                      {pessoa.nome}
                    </Link>
                    <p className="max-w-[16rem] truncate text-[0.75rem] text-tenue" title={pessoa.resumo}>
                      {pessoa.curriculo ? "Currículo anexado · " : ""}
                      {pessoa.resumo || "sem resumo"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[0.78rem]">
                    <span className="block text-navy-900">{pessoa.telefone}</span>
                    <span className="block text-tenue">{pessoa.email}</span>
                  </td>
                  <td className="px-4 py-3 text-tenue">{[pessoa.bairro, pessoa.cidade].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-tenue">{pessoa.origem}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {candidaturas.map((c) => (
                        <Link key={c.id} href={`${BASE}/candidaturas/${c.id}?origem=candidatos`} className="flex items-center gap-1.5 hover:opacity-80">
                          <Etiqueta cor={ETAPAS[c.etapa].cor}>{ETAPAS[c.etapa].rotulo}</Etiqueta>
                          <span className="truncate text-[0.72rem] text-tenue">{vagas.get(c.vaga_id)?.titulo}</span>
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-tenue">{diaLongo(diaDe(pessoa.criado_em))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
