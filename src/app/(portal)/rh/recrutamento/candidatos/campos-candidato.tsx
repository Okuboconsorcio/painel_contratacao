import { ORIGENS } from "@/lib/recrutamento/opcoes";
import type { Candidato } from "@/lib/recrutamento/tipos";

/** Campos da ficha do candidato — os mesmos no cadastro e na edição. */
export default function CamposCandidato({ candidato }: { candidato?: Candidato }) {
  const c = candidato;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="nome" className="rotulo-campo">
          Nome completo <span className="text-royal-vivo">*</span>
        </label>
        <input id="nome" name="nome" required defaultValue={c?.nome} className="campo" />
      </div>
      <div>
        <label htmlFor="data_nascimento" className="rotulo-campo">
          Data de nascimento
        </label>
        <input id="data_nascimento" name="data_nascimento" type="date" defaultValue={c?.data_nascimento ?? ""} className="campo" />
      </div>
      <div>
        <label htmlFor="email" className="rotulo-campo">
          E-mail <span className="text-royal-vivo">*</span>
        </label>
        <input id="email" name="email" type="email" required defaultValue={c?.email} className="campo" />
      </div>
      <div>
        <label htmlFor="telefone" className="rotulo-campo">
          Telefone / WhatsApp <span className="text-royal-vivo">*</span>
        </label>
        <input id="telefone" name="telefone" required placeholder="(11) 90000-0000" defaultValue={c?.telefone} className="campo" />
      </div>
      <div>
        <label htmlFor="cidade" className="rotulo-campo">
          Cidade
        </label>
        <input id="cidade" name="cidade" defaultValue={c?.cidade ?? "São Paulo"} className="campo" />
      </div>
      <div>
        <label htmlFor="bairro" className="rotulo-campo">
          Bairro
        </label>
        <input id="bairro" name="bairro" defaultValue={c?.bairro} className="campo" />
      </div>
      <div>
        <label htmlFor="origem" className="rotulo-campo">
          Como chegou até nós
        </label>
        <select id="origem" name="origem" defaultValue={c?.origem ?? "WhatsApp"} className="campo">
          {ORIGENS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="curriculo" className="rotulo-campo">
          {c?.curriculo ? "Substituir currículo" : "Currículo"} (PDF, Word ou foto, até 4 MB)
        </label>
        <input id="curriculo" name="curriculo" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="campo py-1.5" />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="resumo" className="rotulo-campo">
          Experiência (resumo)
        </label>
        <textarea id="resumo" name="resumo" rows={2} defaultValue={c?.resumo} className="campo" />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="observacoes" className="rotulo-campo">
          Observações internas
        </label>
        <textarea id="observacoes" name="observacoes" rows={2} defaultValue={c?.observacoes} className="campo" />
      </div>
    </div>
  );
}
