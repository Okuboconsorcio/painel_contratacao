import Link from "next/link";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import CicloVaga from "@/components/recrutamento/ciclo-vaga";
import { CartaoNumero, Etiqueta, Secao, Vazio } from "@/components/recrutamento/pecas";
import { linhas, pendencias } from "@/lib/recrutamento/consultas";
import { diaDe, hoje, momento, nomeDoDia, relativo } from "@/lib/recrutamento/datas";
import { lerBanco } from "@/lib/recrutamento/dados";
import { ETAPAS, FUNIL } from "@/lib/recrutamento/opcoes";

const BASE = "/rh/recrutamento";

export default async function PainelRecrutamento() {
  const banco = await lerBanco();
  const agora = new Date();
  const p = pendencias(banco, agora);
  const todas = linhas(banco);
  const abertas = banco.vagas.filter((v) => v.situacao === "ABERTA");
  const emAndamento = todas.filter((l) => !ETAPAS[l.candidatura.etapa].encerrada && l.candidatura.etapa !== "ADMISSAO");

  const proximas = todas
    .filter((l) => l.candidatura.etapa === "ENTREVISTA_AGENDADA" && l.candidatura.entrevista)
    .sort((a, b) => a.candidatura.entrevista!.data_hora.localeCompare(b.candidatura.entrevista!.data_hora))
    .slice(0, 6);

  const recentes = [...todas].sort((a, b) => b.candidatura.criado_em.localeCompare(a.candidatura.criado_em)).slice(0, 6);

  return (
    <div className="surge space-y-6">
      <CabecalhoPagina
        bloco="Gestão de Pessoas"
        titulo="Recrutamento"
        resumo={`${abertas.length} vaga(s) aberta(s) · ${emAndamento.length} candidatura(s) em andamento · ${banco.candidatos.length} pessoas no banco de currículos`}
        acoes={
          <>
            <Link href={`${BASE}/candidatos/novo`} className="rounded-[9px] border border-linha bg-superficie px-3.5 py-2 text-[0.8rem] font-medium text-navy-900 hover:border-royal/40">
              Cadastrar candidato
            </Link>
            <Link href={`${BASE}/vagas/nova`} className="rounded-[9px] bg-royal-vivo px-3.5 py-2 text-[0.8rem] font-medium text-white hover:bg-royal">
              Nova vaga
            </Link>
          </>
        }
      />

      <div>
        <h2 className="sobrancelha mb-2 text-royal/80">Esperando alguém agir</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <CartaoNumero rotulo="Triagem" valor={p.triagem} detalhe="currículos para avaliar" href={`${BASE}/candidatos?etapa=INSCRITO`} destaque={p.triagem > 0} />
          <CartaoNumero rotulo="Contato" valor={p.contato} detalhe="aprovados para agendar" href={`${BASE}/candidatos?etapa=TRIAGEM_APROVADA`} destaque={p.contato > 0} />
          <CartaoNumero
            rotulo="Entrevistas"
            valor={p.entrevistasHoje}
            detalhe={p.entrevistasPassadas ? `hoje · ${p.entrevistasPassadas} já passaram sem registro` : "marcadas para hoje"}
            href={`${BASE}/entrevistas`}
            destaque={p.entrevistasPassadas > 0}
          />
          <CartaoNumero rotulo="Decisão" valor={p.decisao} detalhe="entrevistados aguardando a gestão" href={`${BASE}/candidatos?etapa=ENTREVISTADO`} destaque={p.decisao > 0} />
          <CartaoNumero rotulo="Confirmação" valor={p.confirmacao} detalhe="aprovados sem confirmar o início" href={`${BASE}/candidatos?etapa=APROVADO`} destaque={p.confirmacao > 0} />
        </div>
      </div>

      <Secao titulo="Vagas abertas" acoes={<Link href={`${BASE}/vagas`} className="text-[0.78rem] text-royal-vivo hover:underline">Todas as vagas</Link>}>
        {abertas.length === 0 ? (
          <Vazio>Nenhuma vaga aberta. Crie uma vaga e abra quando cargo, salário, benefícios, horário e atribuições estiverem definidos.</Vazio>
        ) : (
          <div className="space-y-6">
            {abertas.map((v) => {
              const cs = banco.candidaturas.filter((c) => c.vaga_id === v.id);
              return (
                <div key={v.id}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`${BASE}/vagas/${v.id}`} className="font-medium text-navy-900 hover:text-royal-vivo">
                      {v.titulo} <span className="text-tenue">· {v.empresa} · {v.quantidade} vaga(s)</span>
                    </Link>
                    <span className="flex flex-wrap gap-1.5">
                      {FUNIL.map((e) => {
                        const n = cs.filter((c) => c.etapa === e).length;
                        return n ? (
                          <Etiqueta key={e} cor={ETAPAS[e].cor}>
                            {ETAPAS[e].rotulo}: {n}
                          </Etiqueta>
                        ) : null;
                      })}
                    </span>
                  </div>
                  {v.aberta_em && <CicloVaga abertaEm={v.aberta_em} candidaturas={cs} />}
                </div>
              );
            })}
          </div>
        )}
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Próximas entrevistas">
          {proximas.length === 0 ? (
            <Vazio>Nenhuma entrevista marcada.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {proximas.map(({ candidatura: c, candidato, vaga }) => {
                const atrasada = c.entrevista!.data_hora < agora.toISOString();
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`${BASE}/candidaturas/${c.id}?origem=painel`} className="font-medium text-navy-900 hover:text-royal-vivo">
                        {candidato.nome}
                      </Link>
                      <p className="truncate text-[0.75rem] text-tenue">{vaga.titulo}</p>
                    </div>
                    <span className={`text-right text-[0.78rem] ${atrasada ? "font-medium text-red-700" : "text-navy-900"}`}>
                      {nomeDoDia(diaDe(c.entrevista!.data_hora))}, {momento(c.entrevista!.data_hora)}
                      {atrasada && <span className="block text-[0.7rem]">já passou — registrar resultado</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <Secao titulo="Inscrições mais recentes">
          <ul className="divide-y divide-linha">
            {recentes.map(({ candidatura: c, candidato, vaga }) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`${BASE}/candidaturas/${c.id}?origem=painel`} className="font-medium text-navy-900 hover:text-royal-vivo">
                    {candidato.nome}
                  </Link>
                  <p className="truncate text-[0.75rem] text-tenue">
                    {vaga.titulo} · {candidato.origem} · {relativo(diaDe(c.criado_em), hoje())}
                  </p>
                </div>
                <Etiqueta cor={ETAPAS[c.etapa].cor}>{ETAPAS[c.etapa].rotulo}</Etiqueta>
              </li>
            ))}
          </ul>
        </Secao>
      </div>
    </div>
  );
}
