/**
 * Confere as regras do processo sem abrir a tela: ciclo de 12 dias, prazos dos
 * e-mails, e o caminho completo de uma candidatura (inclusive desfazer uma
 * reprovação antes de a negativa sair).
 *
 *   npm run regras:conferir
 *
 * Roda num banco em memória — não toca no `.dados/`.
 */

import { ehSegunda, juntarDiaHora, somarDias, diaDe } from "../src/lib/recrutamento/datas.ts";
import { processarFila } from "../src/lib/recrutamento/emails.ts";
import {
  apagarVencidos,
  confirmarInicio,
  decidir,
  desfazerEncerramento,
  ErroRegra,
  inscrever,
  mudarSituacaoVaga,
  registrarAvaliacao,
  registrarContato,
  registrarTriagem,
  salvarVaga,
} from "../src/lib/recrutamento/processo.ts";
import { MODELOS_EMAIL } from "../src/lib/recrutamento/opcoes.ts";
import { pode } from "../src/lib/recrutamento/permissoes.ts";
import { avisosInicio, fasesDoCiclo, faltaParaAbrir, guardarAte, quandoEnviarLembrete, quandoEnviarNegativa, sugestaoInicio, validarDataInicio } from "../src/lib/recrutamento/regras.ts";
import { criarSemente } from "../src/lib/recrutamento/semente.ts";
import type { Banco, ModeloEmail } from "../src/lib/recrutamento/tipos.ts";

let falhas = 0;
let ok = 0;
function confere(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) ok++;
  else {
    falhas++;
    console.log(`  FALHOU: ${nome} ${detalhe}`);
  }
}
function lanca(nome: string, fn: () => unknown, trecho: string) {
  try {
    fn();
    confere(nome, false, "(deveria ter recusado)");
  } catch (e) {
    confere(nome, e instanceof ErroRegra && e.message.includes(trecho), `(mensagem: ${(e as Error).message})`);
  }
}

console.log("Ciclo de 12 dias");
const fases = fasesDoCiclo("2026-10-26"); // segunda
confere("triagem de terça a quinta", fases[1].inicio === "2026-10-27" && fases[1].fim === "2026-10-29");
confere("entrevistas de sexta a terça", fases[2].inicio === "2026-10-30" && fases[2].fim === "2026-11-03");
confere("retornos de quarta a sexta", fases[3].inicio === "2026-11-04" && fases[3].fim === "2026-11-06");
confere("início na segunda da 3ª semana", fases[4].inicio === "2026-11-09" && ehSegunda(fases[4].inicio));

console.log("Prazos de e-mail");
const agora = new Date(juntarDiaHora("2026-10-29", "15:40"));
confere("negativa 2 dias depois, às 9h", quandoEnviarNegativa(agora, 2) === juntarDiaHora("2026-10-31", "09:00"));
confere(
  "lembrete na véspera às 9h",
  quandoEnviarLembrete(juntarDiaHora("2026-11-03", "14:00"), "09:00", agora) === juntarDiaHora("2026-11-02", "09:00")
);
confere(
  "lembrete na hora se a véspera já passou",
  quandoEnviarLembrete(juntarDiaHora("2026-10-30", "10:00"), "09:00", agora) === agora.toISOString()
);

console.log("Data de início");
confere("aceita quarta-feira, com aviso", validarDataInicio("2026-11-04", "2026-10-29") === null && avisosInicio("2026-11-04").length === 1);
confere("recusa sábado", validarDataInicio("2026-11-07", "2026-10-29") !== null);
confere("recusa segunda no passado", validarDataInicio("2026-10-26", "2026-10-29") !== null);
confere("aceita próxima segunda sem aviso", validarDataInicio("2026-11-09", "2026-10-29") === null && avisosInicio("2026-11-09").length === 0);

confere("Finados na segunda: sugestão vira a terça", sugestaoInicio("2026-10-29") === "2026-11-03");
confere("sugestão normal é a próxima segunda", sugestaoInicio("2026-11-03") === "2026-11-09");

console.log("Vaga");
confere(
  "rascunho sem salário não abre",
  faltaParaAbrir({ titulo: "X", quantidade: 1, salario: "", beneficios: "b", horario: "h", atribuicoes: "a" }).join() === "salário"
);

console.log("Caminho completo de uma candidatura");
const banco: Banco = { ...criarSemente(agora), candidatos: [], candidaturas: [], contatos: [], eventos: [], emails: [] };
// O caminho completo confere o mecanismo da fila, então liga todos os e-mails.
banco.config = { ...banco.config, emails_ligados: Object.keys(MODELOS_EMAIL) as ModeloEmail[] };
const t = (dia: string, h: string) => new Date(juntarDiaHora(dia, h));
const vaga = salvarVaga(
  banco,
  null,
  {
    titulo: "Teste",
    empresa: "MGCON",
    quantidade: 1,
    salario: "s",
    remuneracao: "",
    beneficios: "b",
    horario: "h",
    atribuicoes: "a",
    requisitos: "",
    local: "",
    responsavel_nome: "Letícia",
    responsavel_email: "leticia@exemplo.com.br",
  },
  "teste",
  t("2026-10-26", "08:00")
);
lanca("inscrição em rascunho pela LP é recusada", () =>
  inscrever(banco, { nome: "Ana Teste", email: "ana@exemplo.com.br", telefone: "11900000000", cidade: "", bairro: "", origem: "", resumo: "", observacoes: "", data_nascimento: null, consentimento: true }, vaga.id, null, null, t("2026-10-26", "09:00")),
  "não está recebendo"
);
mudarSituacaoVaga(banco, vaga.id, "ABERTA", "2026-10-26", t("2026-10-26", "08:10"));

const dados = { nome: "Ana Teste", email: "ana@exemplo.com.br", telefone: "11900000000", cidade: "", bairro: "", origem: "Landing page", resumo: "", observacoes: "", data_nascimento: null, consentimento: true };
lanca("sem aceite LGPD é recusado", () => inscrever(banco, { ...dados, consentimento: false }, vaga.id, null, null, t("2026-10-26", "09:00")), "LGPD");
const { candidatura: c } = inscrever(banco, dados, vaga.id, null, null, t("2026-10-26", "09:00"));
confere("confirmação agendada na hora", banco.emails.some((e) => e.modelo === "CONFIRMACAO_CANDIDATURA" && e.agendado_para === t("2026-10-26", "09:00").toISOString()));
lanca("mesma pessoa duas vezes na vaga", () => inscrever(banco, { ...dados, email: "ANA@exemplo.com.br" }, vaga.id, null, null, t("2026-10-26", "09:05")), "já está participando");
lanca("pular etapa é recusado", () => registrarContato(banco, c.id, { canal: "WHATSAPP", resultado: "NAO_ATENDEU", observacao: "", entrevista: null }, "x", t("2026-10-27", "09:00")), "não vale");

registrarTriagem(banco, c.id, { notas: { experiencia: 3, disponibilidade: 3, trajeto: 3, comunicacao: 3 }, comentario: "", decisao: "REPROVADO", motivo: "Engano" }, "Letícia", t("2026-10-27", "10:00"));
const negativa = banco.emails.find((e) => e.modelo === "REPROVADO_TRIAGEM")!;
confere("negativa agendada para 29/10 às 9h", negativa.agendado_para === juntarDiaHora("2026-10-29", "09:00"));
processarFila(banco, t("2026-10-28", "18:00"));
confere("negativa ainda não saiu no dia seguinte", negativa.situacao === "PENDENTE");
desfazerEncerramento(banco, c.id, "Letícia", t("2026-10-28", "18:00"));
confere("desfazer cancela a negativa", negativa.situacao === "CANCELADO");
confere("desfazer volta para inscrito", c.etapa === "INSCRITO" && c.triagem === null);

registrarTriagem(banco, c.id, { notas: { experiencia: 9, disponibilidade: 8, trajeto: 7, comunicacao: 8 }, comentario: "", decisao: "APROVADO", motivo: "" }, "Letícia", t("2026-10-28", "18:10"));
confere("média da triagem", c.triagem?.nota_geral === 8);
lanca(
  "entrevista no passado é recusada",
  () => registrarContato(banco, c.id, { canal: "WHATSAPP", resultado: "AGENDADO", observacao: "", entrevista: { data_hora: juntarDiaHora("2026-10-27", "10:00"), local: "", entrevistadores: "", supervisora: "" } }, "Letícia", t("2026-10-28", "18:20")),
  "passado"
);
registrarContato(banco, c.id, { canal: "WHATSAPP", resultado: "AGENDADO", observacao: "", entrevista: { data_hora: juntarDiaHora("2026-10-30", "10:00"), local: "", entrevistadores: "Leonardo", supervisora: "Sup" } }, "Letícia", t("2026-10-28", "18:20"));
const lembretes = banco.emails.filter((e) => e.candidatura_id === c.id && e.modelo.startsWith("LEMBRETE"));
confere("dois lembretes na véspera", lembretes.length === 2 && lembretes.every((e) => e.agendado_para === juntarDiaHora("2026-10-29", "09:00")));
confere("lembrete da equipe vai para responsável e master", lembretes.find((e) => e.modelo === "LEMBRETE_ENTREVISTA_EQUIPE")!.para.includes("leticia@exemplo.com.br"));

const ficha = {
  dados: Object.fromEntries(["exp_vendas", "exp_telemarketing", "exp_consorcio", "disponivel"].map((k) => [k, { valor: "SIM", detalhe: "" }])),
  notas: Object.fromEntries(["comunicacao", "clareza", "postura", "trajetoria", "rotina", "ganho", "motivacao"].map((k) => [k, { nota: 8, justificativa: "" }])),
  pontos_positivos: ["a", "b", "c"],
  pontos_atencao: ["d", "e", "f"],
  realizada_por: ["Leonardo Okubo"],
  supervisora: "Cristiane Siqueira",
  nota_entrevistador: 8,
  nota_supervisora: 9,
  parecer: "APROVADO" as const,
  ficha: null,
};
const quando = t("2026-10-30", "10:40");
lanca("ficha sem as perguntas de experiência e horário", () => registrarAvaliacao(banco, c.id, { ...ficha, dados: {} }, "Leonardo", quando), "parte 1");
lanca("ficha com 2 pontos positivos", () => registrarAvaliacao(banco, c.id, { ...ficha, pontos_positivos: ["a", "b", ""] }, "Leonardo", quando), "exatamente 3");
lanca("ficha sem quem entrevistou", () => registrarAvaliacao(banco, c.id, { ...ficha, realizada_por: [] }, "Leonardo", quando), "quem fez");
lanca("nota da supervisora sem o nome", () => registrarAvaliacao(banco, c.id, { ...ficha, supervisora: "" }, "Leonardo", quando), "vão juntas");
registrarAvaliacao(banco, c.id, ficha, "Leonardo", quando);
confere("ficha completa registrada", c.etapa === "ENTREVISTADO" && c.avaliacao!.pontos_atencao.length === 3);
lanca("decisão sem quem decidiu", () => decidir(banco, c.id, { resultado: "APROVADO", quem_decidiu: "", comentario: "", motivo: "" }, "Leonardo", t("2026-11-02", "10:00")), "não aprova sozinha");
decidir(banco, c.id, { resultado: "APROVADO", quem_decidiu: "Leonardo e supervisora", comentario: "", motivo: "" }, "Leonardo", t("2026-11-02", "10:00"));
confere("aprovação sai na hora", banco.emails.some((e) => e.candidatura_id === c.id && e.modelo === "APROVADO" && e.agendado_para === t("2026-11-02", "10:00").toISOString()));
lanca("início no sábado é recusado", () => confirmarInicio(banco, c.id, "2026-11-07", "Letícia", t("2026-11-04", "09:00")), "fim de semana");
confirmarInicio(banco, c.id, "2026-11-09", "Letícia", t("2026-11-04", "09:00"));
confere("termina em admissão", c.etapa === "ADMISSAO" && c.data_inicio === "2026-11-09");
confere("histórico completo", banco.eventos.filter((e) => e.candidatura_id === c.id).length >= 8);

console.log("E-mail desligado");
banco.config.emails_ligados = ["ENTREVISTA_AGENDADA"];
const antes = banco.emails.length;
const { candidatura: c2 } = inscrever(banco, { ...dados, nome: "Bruno Teste", email: "bruno@exemplo.com.br", telefone: "11988887777" }, vaga.id, null, null, t("2026-10-27", "09:00"));
confere("confirmação desligada não entra na fila", banco.emails.length === antes);
registrarTriagem(banco, c2.id, { notas: { experiencia: 2, disponibilidade: 3, trajeto: 2, comunicacao: 3 }, comentario: "", decisao: "REPROVADO", motivo: "Sem experiência" }, "Letícia", t("2026-10-28", "09:00"));
confere("negativa desligada não entra na fila", banco.emails.length === antes);

console.log("Guarda dos dados (LGPD)");
confere("12 meses depois do último movimento", guardarAte("2026-01-10T12:00:00Z", [{ etapa: "REPROVADO", atualizado_em: "2026-03-05T12:00:00Z" }], 12) === "2027-03-05");
confere("só o aceite conta quando não há candidatura", guardarAte("2026-10-29T12:00:00Z", [], 12) === "2027-10-29");
{
  const b = structuredClone(banco);
  const bruno = b.candidatos.find((p) => p.email === "bruno@exemplo.com.br")!;
  const ana = b.candidatos.find((p) => p.email === "ana@exemplo.com.br")!;
  confere("antes do prazo, ninguém é apagado", apagarVencidos(b, t("2027-10-27", "09:00")).length === 0 && b.candidatos.length === 2);
  apagarVencidos(b, t("2027-11-01", "09:00"));
  confere("vencido some com histórico e e-mails", !b.candidatos.some((p) => p.id === bruno.id) && !b.eventos.some((e) => e.candidato_id === bruno.id) && !b.candidaturas.some((c) => c.candidato_id === bruno.id));
  confere("contratada continua", b.candidatos.some((p) => p.id === ana.id));
  confere("limpeza registrada sem nome", b.limpezas_lgpd.length === 1 && b.limpezas_lgpd[0].candidatos === 1);
}
confere("contratado não vence", guardarAte("2025-01-01T12:00:00Z", [{ etapa: "ADMISSAO", atualizado_em: "2025-02-01T12:00:00Z" }], 12) === null);

console.log("Permissões");
confere("Letícia registra a decisão", pode("suporte_administrativo", "recrutamento_decidir", "criar"));
confere("Marco registra a decisão", pode("gestor_rh", "recrutamento_decidir", "criar"));
confere("vendedor não registra", !pode("vendedor", "recrutamento_decidir", "criar"));

console.log("Dados de exemplo");
const semente = criarSemente(new Date());
confere("semente só com os e-mails escolhidos", semente.emails.every((e) => semente.config.emails_ligados.includes(e.modelo)));
confere("semente tem candidatos em várias etapas", new Set(semente.candidaturas.map((x) => x.etapa)).size >= 7);
confere("semente sem e-mail real", semente.candidatos.every((x) => x.email.endsWith("@exemplo.com.br")));
confere("todo dia de vaga aberta é válido", semente.vagas.every((v) => !v.aberta_em || /^\d{4}-\d{2}-\d{2}$/.test(v.aberta_em)));
void somarDias;
void diaDe;

console.log(`\n${ok} conferências ok, ${falhas} falhas.`);
process.exit(falhas ? 1 : 0);
