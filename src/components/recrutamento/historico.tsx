import { momento } from "@/lib/recrutamento/datas";
import { ETAPAS } from "@/lib/recrutamento/opcoes";
import type { Evento } from "@/lib/recrutamento/tipos";
import { Etiqueta, Vazio } from "./pecas";

/** Linha do tempo: o mais novo em cima, com quem fez e quando. */
export default function Historico({ eventos, mostrarVaga }: { eventos: (Evento & { vaga?: string })[]; mostrarVaga?: boolean }) {
  if (!eventos.length) return <Vazio>Nada registrado ainda.</Vazio>;
  return (
    <ol className="relative space-y-3 border-l border-linha pl-4">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[1.32rem] top-1.5 h-2 w-2 rounded-full bg-royal/40 ring-2 ring-superficie" />
          <p className="text-[0.72rem] text-tenue">
            {momento(e.em)} · {e.por}
            {mostrarVaga && e.vaga && <> · {e.vaga}</>}
          </p>
          <p className="text-[0.8rem] text-navy-900">{e.texto}</p>
          {e.para && e.de !== e.para && (
            <span className="mt-1 inline-block">
              <Etiqueta cor={ETAPAS[e.para].cor}>{ETAPAS[e.para].rotulo}</Etiqueta>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
