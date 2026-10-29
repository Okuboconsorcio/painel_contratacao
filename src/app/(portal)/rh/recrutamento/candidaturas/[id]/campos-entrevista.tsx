/** Dia, hora, local e quem entrevista — no agendamento e na remarcação. */
export default function CamposEntrevista({
  padrao,
}: {
  padrao: { dia: string; hora?: string; local?: string; entrevistadores: string; supervisora: string };
}) {
  return (
    <div className="grid gap-4 rounded-lg bg-background p-3 sm:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dia" className="rotulo-campo">
            Dia
          </label>
          <input id="dia" name="dia" type="date" defaultValue={padrao.dia} className="campo" />
        </div>
        <div>
          <label htmlFor="hora" className="rotulo-campo">
            Hora
          </label>
          <input id="hora" name="hora" type="time" defaultValue={padrao.hora ?? "10:00"} step={900} className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="local" className="rotulo-campo">
          Local (vazio = endereço padrão)
        </label>
        <input id="local" name="local" defaultValue={padrao.local} className="campo" />
      </div>
      <div>
        <label htmlFor="entrevistadores" className="rotulo-campo">
          Entrevistadores
        </label>
        <input id="entrevistadores" name="entrevistadores" defaultValue={padrao.entrevistadores} className="campo" />
      </div>
      <div>
        <label htmlFor="supervisora" className="rotulo-campo">
          Supervisora que participa
        </label>
        <input id="supervisora" name="supervisora" defaultValue={padrao.supervisora} className="campo" />
      </div>
    </div>
  );
}
