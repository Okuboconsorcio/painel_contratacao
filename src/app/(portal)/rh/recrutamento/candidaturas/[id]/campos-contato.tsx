"use client";

import { useState } from "react";
import { CANAIS, RESULTADOS_CONTATO } from "@/lib/recrutamento/opcoes";
import type { ResultadoContato } from "@/lib/recrutamento/tipos";
import CamposEntrevista from "./campos-entrevista";

/**
 * Registro de contato. Os campos da entrevista só aparecem quando o resultado
 * é "entrevista marcada" — o resto do tempo, são ruído.
 */
export default function CamposContato({ padraoEntrevista }: { padraoEntrevista: { dia: string; entrevistadores: string; supervisora: string } }) {
  const [resultado, setResultado] = useState<ResultadoContato>("AGENDADO");
  const info = RESULTADOS_CONTATO[resultado];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="canal" className="rotulo-campo">
            Por onde
          </label>
          <select id="canal" name="canal" defaultValue="WHATSAPP" className="campo">
            {Object.entries(CANAIS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="resultado" className="rotulo-campo">
            O que aconteceu
          </label>
          <select
            id="resultado"
            name="resultado"
            value={resultado}
            onChange={(e) => setResultado(e.target.value as ResultadoContato)}
            className="campo"
          >
            {Object.entries(RESULTADOS_CONTATO).map(([k, v]) => (
              <option key={k} value={k}>
                {v.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {info.agenda && <CamposEntrevista padrao={padraoEntrevista} />}
      {info.encerra && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-[0.78rem] text-red-800">
          Isto encerra a candidatura como <strong>desistência</strong>. Dá para desfazer depois, se foi engano.
        </p>
      )}

      <div>
        <label htmlFor="observacao" className="rotulo-campo">
          Observação
        </label>
        <input id="observacao" name="observacao" className="campo" placeholder="Ex.: pediu para ligar depois das 18h" />
      </div>
    </div>
  );
}
