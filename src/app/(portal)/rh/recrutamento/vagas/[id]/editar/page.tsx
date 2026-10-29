import { notFound } from "next/navigation";
import CabecalhoPagina from "@/components/cabecalho-pagina";
import { Voltar } from "@/components/recrutamento/pecas";
import { lerBanco } from "@/lib/recrutamento/dados";
import { obterSessao } from "@/lib/recrutamento/sessao";
import FormVaga from "../../form-vaga";

export default async function EditarVaga({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vaga = (await lerBanco()).vagas.find((v) => v.id === id);
  if (!vaga) notFound();
  const sessao = await obterSessao();

  return (
    <div className="surge mx-auto max-w-4xl space-y-5">
      <Voltar href={`/rh/recrutamento/vagas/${vaga.id}`} para={vaga.titulo} />
      <CabecalhoPagina bloco="Recrutamento" titulo="Editar vaga" resumo={vaga.titulo} />
      {sessao.pode("recrutamento", "editar") ? (
        <FormVaga vaga={vaga} />
      ) : (
        <p className="text-[0.83rem] text-tenue">Seu tipo de login não edita vagas.</p>
      )}
    </div>
  );
}
