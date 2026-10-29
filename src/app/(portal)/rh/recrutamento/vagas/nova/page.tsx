import CabecalhoPagina from "@/components/cabecalho-pagina";
import { Voltar } from "@/components/recrutamento/pecas";
import { obterSessao } from "@/lib/recrutamento/sessao";
import FormVaga from "../form-vaga";

export default async function NovaVaga() {
  const sessao = await obterSessao();
  return (
    <div className="surge mx-auto max-w-4xl space-y-5">
      <Voltar href="/rh/recrutamento/vagas" para="Vagas" />
      <CabecalhoPagina bloco="Recrutamento" titulo="Nova vaga" resumo="A vaga nasce como rascunho. Abrir é um passo separado, depois de conferir os dados." />
      {sessao.pode("recrutamento", "criar") ? (
        <FormVaga
          vaga={{
            id: "",
            slug: "",
            titulo: "",
            empresa: "MGCON",
            quantidade: 1,
            salario: "",
            remuneracao: "",
            beneficios: "",
            horario: "",
            atribuicoes: "",
            requisitos: "",
            local: "",
            responsavel_nome: "Letícia Garcia",
            responsavel_email: "",
            situacao: "RASCUNHO",
            aberta_em: null,
            encerrada_em: null,
            criado_em: "",
            criado_por: "",
          }}
        />
      ) : (
        <p className="text-[0.83rem] text-tenue">Seu tipo de login não cria vagas.</p>
      )}
    </div>
  );
}
