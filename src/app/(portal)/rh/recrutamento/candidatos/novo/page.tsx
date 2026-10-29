import CabecalhoPagina from "@/components/cabecalho-pagina";
import FormularioAcao from "@/components/recrutamento/formulario-acao";
import { Voltar } from "@/components/recrutamento/pecas";
import { lerBanco } from "@/lib/recrutamento/dados";
import { obterSessao } from "@/lib/recrutamento/sessao";
import { novoCandidatoAcao } from "../../actions";
import CamposCandidato from "../campos-candidato";

/**
 * Cadastro manual: para o currículo que chega por WhatsApp, indicação ou
 * e-mail, fora da landing page. Entra no mesmo fluxo e recebe o mesmo e-mail
 * de confirmação (quando ligado).
 */
export default async function NovoCandidato() {
  const sessao = await obterSessao();
  const banco = await lerBanco();
  const vagas = banco.vagas.filter((v) => v.situacao !== "ENCERRADA");

  return (
    <div className="surge mx-auto max-w-4xl space-y-5">
      <Voltar href="/rh/recrutamento/candidatos" para="Banco de currículos" />
      <CabecalhoPagina
        bloco="Recrutamento"
        titulo="Cadastrar candidato"
        resumo="Para currículos que chegam fora da landing page. Se o e-mail ou telefone já estiver no banco, a ficha existente é atualizada."
      />
      {!sessao.pode("recrutamento", "criar") ? (
        <p className="text-[0.83rem] text-tenue">Seu tipo de login não cadastra candidatos.</p>
      ) : vagas.length === 0 ? (
        <p className="text-[0.83rem] text-tenue">Não há vaga aberta, pausada ou em rascunho para inscrever o candidato.</p>
      ) : (
        <FormularioAcao acao={novoCandidatoAcao} botao="Cadastrar e inscrever" className="painel p-5">
          <div className="mb-4 max-w-md">
            <label htmlFor="vaga_id" className="rotulo-campo">
              Vaga <span className="text-royal-vivo">*</span>
            </label>
            <select id="vaga_id" name="vaga_id" className="campo">
              {vagas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo} · {v.empresa} ({v.situacao.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
          <CamposCandidato />
          <label className="mt-4 flex items-start gap-2 text-[0.8rem] text-navy-900">
            <input type="checkbox" name="consentimento" value="sim" className="mt-0.5" />
            <span>
              O candidato autorizou guardar os dados e o currículo para este e futuros processos seletivos por até {banco.config.meses_guarda} meses
              depois do último contato (LGPD). Sem essa autorização, o cadastro não é feito.
            </span>
          </label>
        </FormularioAcao>
      )}
    </div>
  );
}
