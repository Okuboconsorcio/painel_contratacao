import { lerArquivo } from "@/lib/recrutamento/dados";
import { obterSessao } from "@/lib/recrutamento/sessao";

/**
 * Abre um currículo ou ficha de avaliação. Só para quem vê o recrutamento —
 * currículo é dado pessoal. No Polaris: link assinado e temporário do bucket
 * privado `rh` do Storage, gerado depois de conferir `pode('recrutamento','ver')`.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao.pode("recrutamento", "ver")) return new Response("Sem acesso.", { status: 403 });

  const { id } = await params;
  const arquivo = await lerArquivo(id);
  if (!arquivo) return new Response("Arquivo não encontrado.", { status: 404 });

  const ext = arquivo.nome.split(".").pop()?.toLowerCase();
  const tipo =
    ext === "pdf"
      ? "application/pdf"
      : ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : "application/octet-stream";

  return new Response(new Uint8Array(arquivo.conteudo), {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `inline; filename="${arquivo.nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
