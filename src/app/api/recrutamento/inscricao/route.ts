import { salvarArquivo, transacao, lerBanco } from "@/lib/recrutamento/dados";
import { ErroRegra, inscrever } from "@/lib/recrutamento/processo";

/**
 * Porta de entrada da landing page de vagas.
 *
 * GET  → vagas abertas (para a página listar), sem nenhum dado interno.
 * POST → inscrição: formulário `multipart/form-data` com
 *        vaga (código da vaga), nome, email, telefone, cidade, bairro,
 *        data_nascimento, resumo, origem, consentimento=sim e o arquivo `curriculo`.
 *
 * Quem chama é o servidor do site da MGCON (`www.mgconltda.com.br/vagas`), nunca
 * o navegador do candidato. A inscrição exige o cabeçalho `x-chave-lp` igual a
 * `RECRUTAMENTO_CHAVE_LP` — a mesma senha configurada nos dois projetos da
 * Vercel. Na Vercel, sem a senha configurada, a inscrição fica fechada: sem
 * isso, qualquer um poderia jogar inscrição no banco. No computador
 * (protótipo), sem senha, aceita.
 */

function autorizado(req: Request) {
  const chave = process.env.RECRUTAMENTO_CHAVE_LP;
  if (!chave) return !process.env.VERCEL;
  return req.headers.get("x-chave-lp") === chave;
}

export async function GET() {
  const vagas = (await lerBanco())
    .vagas.filter((v) => v.situacao === "ABERTA")
    .map((v) => ({
      codigo: v.slug,
      titulo: v.titulo,
      empresa: v.empresa,
      salario: v.salario,
      remuneracao: v.remuneracao,
      beneficios: v.beneficios,
      horario: v.horario,
      atribuicoes: v.atribuicoes,
      requisitos: v.requisitos,
      diferenciais: v.diferenciais ?? "",
      // Sem `local`: o endereço só é passado depois de marcar a entrevista.
    }));
  return Response.json({ vagas });
}

export async function POST(req: Request) {
  if (!autorizado(req)) return Response.json({ ok: false, erro: "Não autorizado." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false, erro: "Envie o formulário como multipart/form-data." }, { status: 400 });
  }
  const txt = (k: string) => String(form.get(k) ?? "").trim();

  try {
    const vaga = (await lerBanco()).vagas.find((v) => v.slug === txt("vaga"));
    if (!vaga) throw new ErroRegra("Vaga não encontrada.");
    const arquivo = form.get("curriculo");
    const curriculo = await salvarArquivo(arquivo instanceof File ? arquivo : null);
    await transacao((b) =>
      inscrever(
        b,
        {
          nome: txt("nome"),
          email: txt("email"),
          telefone: txt("telefone"),
          cidade: txt("cidade"),
          bairro: txt("bairro"),
          origem: txt("origem") || "Landing page",
          resumo: txt("resumo"),
          observacoes: "",
          data_nascimento: txt("data_nascimento") || null,
          consentimento: txt("consentimento") === "sim",
        },
        vaga.id,
        curriculo,
        null,
        new Date()
      )
    );
    // Resposta mínima: a landing page não precisa (nem deve) saber se a pessoa já existia no banco.
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof ErroRegra) return Response.json({ ok: false, erro: e.message }, { status: 422 });
    console.error(e);
    return Response.json({ ok: false, erro: "Não foi possível registrar a inscrição." }, { status: 500 });
  }
}
