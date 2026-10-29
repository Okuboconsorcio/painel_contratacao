import Link from "next/link";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import { Etiqueta, linkWhatsApp, Secao, Vazio } from "@/components/recrutamento/pecas";
import { linhas, type Linha } from "@/lib/recrutamento/consultas";
import { diaDe, diaLongo, hora, hoje, nomeDoDia, relativo } from "@/lib/recrutamento/datas";
import { lerBanco } from "@/lib/recrutamento/dados";

const BASE = "/rh/recrutamento";

/** Agenda: as entrevistas marcadas, por dia. As que já passaram sem registro ficam no topo, em vermelho. */
export default async function Entrevistas() {
  const banco = await lerBanco();
  const agora = new Date().toISOString();
  const marcadas = linhas(banco)
    .filter((l) => l.candidatura.etapa === "ENTREVISTA_AGENDADA" && l.candidatura.entrevista)
    .sort((a, b) => a.candidatura.entrevista!.data_hora.localeCompare(b.candidatura.entrevista!.data_hora));

  const passadas = marcadas.filter((l) => l.candidatura.entrevista!.data_hora < agora);
  const futuras = marcadas.filter((l) => l.candidatura.entrevista!.data_hora >= agora);
  const porDia = new Map<string, Linha[]>();
  for (const l of futuras) {
    const d = diaDe(l.candidatura.entrevista!.data_hora);
    porDia.set(d, [...(porDia.get(d) ?? []), l]);
  }

  const Linha = ({ l, atrasada = false }: { l: Linha; atrasada?: boolean }) => {
    const e = l.candidatura.entrevista!;
    return (
      <li className="grid gap-2 py-3 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center">
        <span className={`numero-painel text-[1.05rem] ${atrasada ? "text-red-700" : "text-navy-900"}`}>{hora(e.data_hora)}</span>
        <div className="min-w-0">
          <Link href={`${BASE}/candidaturas/${l.candidatura.id}?origem=entrevistas`} className="font-medium text-navy-900 hover:text-royal-vivo">
            {l.candidato.nome}
          </Link>
          <p className="truncate text-[0.75rem] text-tenue">
            {l.vaga.titulo} · {e.entrevistadores || "entrevistadores a definir"}
            {e.supervisora && ` · ${e.supervisora}`}
            {l.candidatura.triagem && ` · triagem ${l.candidatura.triagem.nota_geral.toLocaleString("pt-BR")}`}
          </p>
        </div>
        <span className="flex items-center gap-2">
          {e.remarcacoes > 0 && <Etiqueta cor="amarelo">remarcada {e.remarcacoes}x</Etiqueta>}
          <a href={linkWhatsApp(l.candidato.telefone)} target="_blank" rel="noreferrer" className="text-[0.75rem] text-green-700 hover:underline">
            WhatsApp
          </a>
        </span>
      </li>
    );
  };

  return (
    <div className="surge space-y-6">
      <CabecalhoPagina bloco="Recrutamento" titulo="Entrevistas" resumo={`${futuras.length} marcada(s) daqui para frente${passadas.length ? ` · ${passadas.length} já passaram sem registro` : ""}`} />

      {passadas.length > 0 && (
        <Secao titulo="Já passaram — falta registrar o resultado" className="ring-1 ring-red-200">
          <ul className="divide-y divide-linha">
            {passadas.map((l) => (
              <Linha key={l.candidatura.id} l={l} atrasada />
            ))}
          </ul>
          <p className="mt-2 text-[0.75rem] text-tenue">Abra a candidatura e registre a entrevista, a remarcação ou o não comparecimento.</p>
        </Secao>
      )}

      {futuras.length === 0 ? (
        <Vazio>Nenhuma entrevista marcada. Elas aparecem aqui quando um contato registra &ldquo;entrevista marcada&rdquo;.</Vazio>
      ) : (
        [...porDia.entries()].map(([dia, ls]) => (
          <Secao key={dia} titulo={`${nomeDoDia(dia)}, ${diaLongo(dia)} · ${relativo(dia, hoje())}`}>
            <ul className="divide-y divide-linha">
              {ls.map((l) => (
                <Linha key={l.candidatura.id} l={l} />
              ))}
            </ul>
          </Secao>
        ))
      )}
    </div>
  );
}
