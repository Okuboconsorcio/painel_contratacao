import { diaCurto, hoje, nomeDoDia } from "@/lib/recrutamento/datas";
import { atrasadas, avisoAbertura, avisoFeriado, diaDoCiclo, fasesDoCiclo } from "@/lib/recrutamento/regras";
import type { Candidatura } from "@/lib/recrutamento/tipos";

/**
 * A linha do tempo de 12 dias da vaga: cada fase com suas datas, a de hoje em
 * destaque e, em vermelho, quem ficou parado numa fase que já venceu — é isso
 * que empurra o início do colaborador para a outra segunda.
 */
export default function CicloVaga({
  abertaEm,
  candidaturas,
  compacto = false,
}: {
  abertaEm: string;
  candidaturas: Candidatura[];
  compacto?: boolean;
}) {
  const dia = hoje();
  const fases = fasesDoCiclo(abertaEm);
  const n = diaDoCiclo(abertaEm, dia) ?? 0;
  const atrasos = atrasadas(abertaEm, dia, candidaturas);
  const aviso = avisoAbertura(abertaEm);
  const feriadoInicio = avisoFeriado(fases[fases.length - 1].inicio);

  return (
    <div>
      <ol className={`grid gap-2 ${compacto ? "grid-cols-5" : "grid-cols-1 sm:grid-cols-5"}`}>
        {fases.map((f) => {
          const agora = dia >= f.inicio && dia <= f.fim;
          const passou = dia > f.fim;
          return (
            <li
              key={f.chave}
              className={`rounded-lg border px-2.5 py-2 ${
                agora
                  ? "border-royal-vivo/50 bg-royal-vivo/[0.06]"
                  : passou
                    ? "border-linha bg-background"
                    : "border-dashed border-linha"
              }`}
            >
              <p className={`text-[0.65rem] font-semibold uppercase tracking-wide ${agora ? "text-royal-vivo" : "text-tenue"}`}>
                {f.diaInicio === f.diaFim ? `Dia ${f.diaInicio}` : `Dias ${f.diaInicio}–${f.diaFim}`}
                {agora && " · agora"}
              </p>
              {!compacto && <p className="mt-0.5 text-[0.78rem] font-medium leading-snug text-navy-900">{f.rotulo}</p>}
              <p className="mt-0.5 text-[0.72rem] text-tenue">
                {f.inicio === f.fim ? `${nomeDoDia(f.inicio)} ${diaCurto(f.inicio)}` : `${diaCurto(f.inicio)} a ${diaCurto(f.fim)}`}
              </p>
              {!compacto && <p className="mt-1 text-[0.68rem] leading-snug text-tenue/80">{f.responsavel}</p>}
            </li>
          );
        })}
      </ol>

      <div className="mt-2 space-y-1 text-[0.75rem]">
        <p className="text-tenue">
          {n < 1 ? "O ciclo ainda não começou." : n > 15 ? `Ciclo encerrado há ${n - 15} dia(s).` : `Hoje é o dia ${n} do ciclo.`}
        </p>
        {atrasos.map((a) => (
          <p key={a.fase.chave} className="font-medium text-red-700">
            {a.quantidade} candidato(s) ainda em &ldquo;{a.fase.rotulo.toLowerCase()}&rdquo;, que venceu em{" "}
            {diaCurto(a.fase.fim)}. Atraso aqui empurra o início para a segunda seguinte.
          </p>
        ))}
        {aviso && !compacto && <p className="text-amber-800">{aviso}</p>}
        {feriadoInicio && <p className="text-amber-800">Atenção: o dia previsto para o início, {feriadoInicio} Combinar a data com o RH.</p>}
      </div>
    </div>
  );
}
