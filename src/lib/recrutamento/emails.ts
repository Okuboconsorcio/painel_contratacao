/**
 * E-mails do recrutamento: textos, agendamento e a fila.
 *
 * Nada é enviado na hora em que a tela grava. Toda mensagem entra numa **fila**
 * com o horário em que deve sair; quem envia é o processamento da fila. Isso
 * resolve as três regras do documento de uma vez:
 *
 * - aprovação e entrevista marcada saem na hora (agendado_para = agora);
 * - a negativa sai 2 dias depois — e se alguém desfizer a reprovação antes,
 *   o e-mail é cancelado e o candidato nunca recebe;
 * - o lembrete sai na véspera da entrevista, e é refeito se ela for remarcada.
 *
 * **No protótipo, o envio é simulado** (marca como enviado e registra o
 * motivo). No Polaris, `processarFila` chama `enviarEmail` de `src/lib/email.ts`,
 * que já existe e manda pelo SMTP do Google.
 */

import { momento, nomeDoDia, diaDe } from "./datas.ts";
import { MODELOS_EMAIL } from "./opcoes.ts";
import { quandoEnviarLembrete, quandoEnviarNegativa } from "./regras.ts";
import type { Banco, Candidato, Candidatura, Email, ModeloEmail, Vaga } from "./tipos.ts";

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function empresaPorExtenso(vaga: Vaga) {
  return vaga.empresa === "MGCON" ? "MGCON" : "Okubo Consórcio";
}

/** Os textos. Curtos, em português de gente, sem prometer o que não depende de nós. */
export function montarEmail(
  modelo: ModeloEmail,
  dados: { candidato: Candidato; vaga: Vaga; candidatura: Candidatura; endereco: string }
): { assunto: string; linhas: string[] } {
  const { candidato, vaga, candidatura, endereco } = dados;
  const nome = primeiroNome(candidato.nome);
  const empresa = empresaPorExtenso(vaga);
  const entrevista = candidatura.entrevista;
  const quando = entrevista
    ? `${nomeDoDia(diaDe(entrevista.data_hora))}, ${momento(entrevista.data_hora)}`
    : "";
  const local = entrevista?.local || endereco;

  switch (modelo) {
    case "CONFIRMACAO_CANDIDATURA":
      return {
        assunto: `Recebemos sua candidatura — ${vaga.titulo}`,
        linhas: [
          `Olá, ${nome}!`,
          `Recebemos sua candidatura para a vaga de ${vaga.titulo} na ${empresa}. Obrigado pelo interesse.`,
          "Nossa equipe vai analisar seu currículo nos próximos dias. Se o seu perfil seguir no processo, entraremos em contato pelo telefone ou WhatsApp que você informou para marcar uma entrevista.",
          "Você recebe uma resposta por e-mail de qualquer forma. Até lá, é só aguardar.",
        ],
      };

    case "ENTREVISTA_AGENDADA":
      return {
        assunto: `Entrevista marcada — ${vaga.titulo}`,
        linhas: [
          `Olá, ${nome}!`,
          `Sua entrevista para a vaga de ${vaga.titulo} está marcada para ${quando}.`,
          `Local: ${local}.`,
          "Traga um documento com foto. Se não puder comparecer, avise com antecedência respondendo este e-mail ou pelo WhatsApp, para remarcarmos.",
        ],
      };

    case "LEMBRETE_ENTREVISTA":
      return {
        assunto: `Lembrete: sua entrevista é amanhã — ${vaga.titulo}`,
        linhas: [
          `Olá, ${nome}!`,
          `Passando para lembrar da sua entrevista para a vaga de ${vaga.titulo}: ${quando}.`,
          `Local: ${local}.`,
          "Se tiver algum imprevisto, avise o quanto antes para remarcarmos.",
        ],
      };

    case "LEMBRETE_ENTREVISTA_EQUIPE":
      return {
        assunto: `Entrevista amanhã: ${candidato.nome} — ${vaga.titulo}`,
        linhas: [
          `Lembrete da entrevista de ${candidato.nome} para ${vaga.titulo}: ${quando}.`,
          `Entrevistadores: ${entrevista?.entrevistadores || "a definir"}. Supervisora: ${entrevista?.supervisora || "a definir"}.`,
          `Telefone do candidato: ${candidato.telefone}. Nota da triagem: ${candidatura.triagem?.nota_geral ?? "—"}.`,
          "Leve a ficha de avaliação impressa. Depois da entrevista, registre o resultado no painel.",
        ],
      };

    case "APROVADO":
      return {
        assunto: `Você foi aprovado(a) — ${vaga.titulo}`,
        linhas: [
          `Olá, ${nome}! Temos uma ótima notícia: você foi aprovado(a) no processo seletivo para a vaga de ${vaga.titulo} na ${empresa}.`,
          "Em breve nossa equipe vai falar com você pelo WhatsApp para confirmar a data de início e os próximos passos.",
          "Seja bem-vindo(a) ao time!",
        ],
      };

    case "REPROVADO_TRIAGEM":
      return {
        assunto: `Sua candidatura — ${vaga.titulo}`,
        linhas: [
          `Olá, ${nome}.`,
          `Agradecemos seu interesse na vaga de ${vaga.titulo} na ${empresa}. Analisamos seu currículo com atenção e, neste momento, seu perfil não seguirá para a etapa de entrevistas.`,
          "Seus dados ficam no nosso banco de currículos e podemos entrar em contato em uma próxima oportunidade.",
          "Desejamos sucesso na sua busca!",
        ],
      };

    case "REPROVADO_ENTREVISTA":
      return {
        assunto: `Retorno da sua entrevista — ${vaga.titulo}`,
        linhas: [
          `Olá, ${nome}.`,
          `Obrigado por participar da entrevista para a vaga de ${vaga.titulo} na ${empresa}. Depois de avaliar todos os candidatos, optamos por seguir com outro perfil neste momento.`,
          "Seus dados ficam no nosso banco de currículos e podemos entrar em contato em uma próxima oportunidade.",
          "Desejamos sucesso na sua busca!",
        ],
      };
  }
}

let contador = 0;
function novoId() {
  contador = (contador + 1) % 1000;
  return `em_${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Põe um e-mail na fila. Não envia — quem envia é `processarFila`.
 * Modelo desligado na configuração não entra na fila (devolve `null`).
 */
export function agendarEmail(
  banco: Banco,
  modelo: ModeloEmail,
  candidatura: Candidatura,
  quando: string,
  agora: Date,
  para?: string[]
): Email | null {
  if (!banco.config.emails_ligados.includes(modelo)) return null;
  const candidato = banco.candidatos.find((c) => c.id === candidatura.candidato_id);
  const vaga = banco.vagas.find((v) => v.id === candidatura.vaga_id);
  if (!candidato || !vaga) return null;

  const destino = para ?? [candidato.email];
  const texto = montarEmail(modelo, {
    candidato,
    vaga,
    candidatura,
    endereco: banco.config.endereco_entrevista,
  });

  const email: Email = {
    id: novoId(),
    candidato_id: candidato.id,
    candidatura_id: candidatura.id,
    modelo,
    para: destino.filter((e) => e.includes("@")),
    assunto: texto.assunto,
    linhas: texto.linhas,
    agendado_para: quando,
    situacao: "PENDENTE",
    enviado_em: null,
    motivo: "",
    criado_em: agora.toISOString(),
  };
  banco.emails.push(email);
  return email;
}

/** Cancela o que ainda não saiu. Sem `modelos`, cancela tudo da candidatura. */
export function cancelarPendentes(
  banco: Banco,
  candidaturaId: string,
  motivo: string,
  modelos?: ModeloEmail[]
): number {
  let n = 0;
  for (const e of banco.emails) {
    if (
      e.candidatura_id === candidaturaId &&
      e.situacao === "PENDENTE" &&
      (!modelos || modelos.includes(e.modelo))
    ) {
      e.situacao = "CANCELADO";
      e.motivo = motivo;
      n++;
    }
  }
  return n;
}

/** Os dois lembretes (candidato e equipe) da entrevista marcada. */
export function agendarLembretes(banco: Banco, candidatura: Candidatura, agora: Date) {
  if (!candidatura.entrevista) return;
  const vaga = banco.vagas.find((v) => v.id === candidatura.vaga_id);
  const quando = quandoEnviarLembrete(
    candidatura.entrevista.data_hora,
    banco.config.hora_lembrete,
    agora
  );
  agendarEmail(banco, "LEMBRETE_ENTREVISTA", candidatura, quando, agora);
  agendarEmail(banco, "LEMBRETE_ENTREVISTA_EQUIPE", candidatura, quando, agora, [
    ...(vaga?.responsavel_email ? [vaga.responsavel_email] : []),
    ...banco.config.emails_master,
  ]);
}

export function agendarNegativa(
  banco: Banco,
  modelo: "REPROVADO_TRIAGEM" | "REPROVADO_ENTREVISTA",
  candidatura: Candidatura,
  agora: Date
) {
  const quando = quandoEnviarNegativa(agora, banco.config.dias_espera_negativa);
  agendarEmail(banco, modelo, candidatura, quando, agora);
}

/**
 * Envia (simula) tudo o que já passou da hora. Devolve quantos saíram.
 * Lugar único de envio: no Polaris, vira uma rota chamada pelo agendador da
 * Vercel a cada 15 minutos e passa a usar `enviarEmail` de verdade.
 */
export function processarFila(banco: Banco, agora: Date): number {
  const limite = agora.toISOString();
  let n = 0;
  for (const e of banco.emails) {
    if (e.situacao !== "PENDENTE" || e.agendado_para > limite) continue;
    if (!e.para.length) {
      e.situacao = "FALHOU";
      e.motivo = "sem destinatário com e-mail";
      continue;
    }
    e.situacao = "ENVIADO";
    e.enviado_em = limite;
    e.motivo = "simulado — protótipo sem servidor de e-mail";
    n++;
  }
  return n;
}

export function rotuloModelo(modelo: ModeloEmail) {
  return MODELOS_EMAIL[modelo].rotulo;
}

