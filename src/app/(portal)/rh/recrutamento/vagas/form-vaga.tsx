import FormularioAcao from "@/components/recrutamento/formulario-acao";
import type { Vaga } from "@/lib/recrutamento/tipos";
import { salvarVagaAcao } from "../actions";

/** Formulário de vaga, o mesmo para criar e editar. */
export default function FormVaga({ vaga }: { vaga?: Vaga }) {
  const campo = (
    nome: keyof Vaga,
    rotulo: string,
    opcoes: { textarea?: boolean; obrigatorio?: boolean; ajuda?: string; tipo?: string; span?: boolean } = {}
  ) => (
    <div className={opcoes.span ? "md:col-span-2" : ""}>
      <label htmlFor={nome} className="rotulo-campo">
        {rotulo}
        {opcoes.obrigatorio && <span className="text-royal-vivo"> *</span>}
      </label>
      {opcoes.textarea ? (
        <textarea id={nome} name={nome} rows={3} defaultValue={String(vaga?.[nome] ?? "")} className="campo" />
      ) : (
        <input id={nome} name={nome} type={opcoes.tipo ?? "text"} defaultValue={String(vaga?.[nome] ?? "")} className="campo" />
      )}
      {opcoes.ajuda && <p className="mt-1 text-[0.7rem] text-tenue">{opcoes.ajuda}</p>}
    </div>
  );

  return (
    <FormularioAcao acao={salvarVagaAcao} botao={vaga?.id ? "Salvar alterações" : "Criar vaga como rascunho"} className="painel p-5">
      <input type="hidden" name="vaga_id" value={vaga?.id ?? ""} />
      <p className="mb-4 text-[0.8rem] text-tenue">
        Os campos com <span className="text-royal-vivo">*</span> são obrigatórios para <strong>abrir</strong> a vaga (regra 1 do
        processo: nenhuma vaga é divulgada antes de cargo, salário, benefícios, horário e atribuições estarem definidos).
        Dá para salvar o rascunho incompleto.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {campo("titulo", "Cargo", { obrigatorio: true })}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="empresa" className="rotulo-campo">
              Empresa
            </label>
            <select id="empresa" name="empresa" defaultValue={vaga?.empresa ?? "MGCON"} className="campo">
              <option value="MGCON">MGCON</option>
              <option value="OKUBO">Okubo</option>
            </select>
          </div>
          {campo("quantidade", "Número de vagas", { obrigatorio: true, tipo: "number" })}
        </div>
        {campo("salario", "Salário", { obrigatorio: true })}
        {campo("remuneracao", "Forma de remuneração", { ajuda: "Ex.: fixo + comissão por venda + bonificação por meta." })}
        {campo("beneficios", "Benefícios", { obrigatorio: true })}
        {campo("horario", "Horário de trabalho", { obrigatorio: true })}
        {campo("atribuicoes", "Atribuições e funções", { obrigatorio: true, textarea: true, span: true })}
        {campo("requisitos", "Requisitos", { textarea: true, span: true, ajuda: "Um por linha. Aparece na página de vagas como lista." })}
        {campo("diferenciais", "Conta ponto (diferenciais)", { textarea: true, span: true, ajuda: "O que ajuda, mas não é exigido. Um por linha. Ex.: experiência em consórcio." })}
        {campo("local", "Local de trabalho", { ajuda: "Uso interno: não aparece na página de vagas." })}
        <div />
        {campo("responsavel_nome", "Responsável pela triagem", { ajuda: "Recebe o lembrete das entrevistas." })}
        {campo("responsavel_email", "E-mail da responsável", { tipo: "email" })}
      </div>
    </FormularioAcao>
  );
}
