/**
 * Dados de exemplo para o protótipo abrir com algo na tela.
 *
 * **Todas as pessoas são fictícias** (e-mails em exemplo.com.br, telefones com
 * 0000). A história é montada passando pelo próprio motor do processo
 * (`processo.ts`), com o relógio ajustado para cada passo — assim o histórico,
 * os e-mails e os indicadores saem exatamente como sairiam no uso real.
 *
 * Duas vagas com histórico:
 * - uma encerrada, de quatro semanas atrás, com o ciclo completo (gente admitida,
 *   reprovada, desistente e em reserva) — alimenta os indicadores;
 * - uma aberta nesta semana, com candidatos espalhados por todas as etapas.
 * E uma terceira em rascunho, sem salário, para mostrar a regra 1.
 */

import { diaDaSemana, hoje, juntarDiaHora, somarDias } from "./datas.ts";
import { processarFila } from "./emails.ts";
import {
  confirmarInicio,
  decidir,
  inscrever,
  mudarSituacaoVaga,
  naoCompareceu,
  registrarAvaliacao,
  registrarContato,
  registrarTriagem,
  remarcarEntrevista,
  salvarVaga,
  type DadosCandidato,
} from "./processo.ts";
import type { Banco } from "./tipos.ts";

const LETICIA = "Letícia Garcia";
const LEONARDO = "Leonardo Okubo";

function pessoa(nome: string, i: number, extra: Partial<DadosCandidato> = {}): DadosCandidato {
  const login = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(" ")
    .join(".");
  return {
    nome,
    email: `${login}@exemplo.com.br`,
    telefone: `(11) 90000-${String(1000 + i).slice(-4)}`,
    cidade: "São Paulo",
    bairro: ["Mooca", "Tatuapé", "Penha", "Brás", "Belém", "Vila Prudente", "Carrão"][i % 7],
    origem: ["Landing page", "Instagram", "Landing page", "Indicação", "Facebook", "Landing page", "Indeed"][i % 7],
    resumo: [
      "2 anos de telemarketing ativo em operadora de telefonia.",
      "Atendente de loja há 1 ano, quer migrar para vendas.",
      "Primeiro emprego. Ensino médio completo.",
      "Vendedor de consórcio por 8 meses em outra revenda.",
      "Operadora de cobrança, 3 anos.",
      "Recepcionista em clínica, 1 ano e meio.",
      "SAC receptivo em banco, 2 anos.",
    ][i % 7],
    observacoes: "",
    data_nascimento: null,
    consentimento: true,
    ...extra,
  };
}

const notasTriagem = (base: number) => ({
  experiencia: Math.min(10, base + 1),
  disponibilidade: base,
  trajeto: Math.max(0, base - 1),
  comunicacao: base,
});

const r = (valor: string, detalhe = "") => ({ valor, detalhe });

const avaliacao = (base: number, parecer: "APROVADO" | "REPROVADO" | "RESERVA") => ({
  dados: {
    idade: r("24"),
    estado_civil: r("Solteira"),
    bairro_cidade: r("Centro, São Paulo"),
    filhos: r("NAO"),
    rede_apoio: r(""),
    vale_transporte: r("SIM", "2 por dia"),
    deslocamento: r("40 min"),
    ultimo_emprego: r("Operadora de cobrança — fim do contrato"),
    exp_vendas: r("SIM", "1 ano, loja de varejo"),
    exp_telemarketing: r(base >= 7 ? "SIM" : "NAO", base >= 7 ? "8 meses, cobrança" : ""),
    exp_consorcio: r("NAO"),
    disponivel: r("SIM"),
    pretensao: r("Fixo da vaga"),
    inicio: r("Imediato"),
  },
  notas: Object.fromEntries(
    ["comunicacao", "clareza", "postura", "trajetoria", "rotina", "ganho", "motivacao"].map((k, i) => [
      k,
      { nota: Math.max(0, Math.min(10, base + ((i % 3) - 1))), justificativa: "" },
    ])
  ),
  pontos_positivos: [
    "Boa dicção, falou no ritmo certo o tempo todo",
    "Já conhece rotina de discadora pela cobrança",
    "Contou com naturalidade sobre ouvir muitos \"não\"",
  ],
  pontos_atencao: [
    "Pouca experiência com metas mensais",
    "Hesitou ao falar da parte variável do ganho",
    "Saiu do último emprego em menos de um ano",
  ],
  realizada_por: ["Leonardo Okubo"],
  supervisora: "Cristiane Siqueira",
  nota_entrevistador: base,
  nota_supervisora: base,
  parecer,
  ficha: null,
});

/** Segunda-feira mais recente que seja, no mínimo, dois dias antes de `dia`. */
function segundaDoCiclo(dia: string) {
  const ref = somarDias(dia, -2);
  return somarDias(ref, -((diaDaSemana(ref) + 6) % 7));
}

/** Próximo dia de semana (seg–sex) depois de `dia`. */
function proximoDiaUtil(dia: string, pular = 1) {
  let d = dia;
  let n = 0;
  while (n < pular) {
    d = somarDias(d, 1);
    if (diaDaSemana(d) !== 0 && diaDaSemana(d) !== 6) n++;
  }
  return d;
}

export function criarSemente(agoraReal: Date): Banco {
  const banco: Banco = {
    versao: 1,
    config: {
      remetente: "Recrutamento MGCON <recrutamento@exemplo.com.br>",
      emails_master: ["nicolas@exemplo.com.br", "leonardo@exemplo.com.br"],
      dias_espera_negativa: 2,
      hora_lembrete: "09:00",
      endereco_entrevista: "R. Cabo Diogo Oliver, 536 - Vila Mogilar - SP, 08773-000",
      // Decisão do Nicolas (29/10): por ora, só o e-mail da entrevista marcada
      // e os lembretes. Os outros ligam na tela de E-mails.
      emails_ligados: ["ENTREVISTA_AGENDADA", "LEMBRETE_ENTREVISTA", "LEMBRETE_ENTREVISTA_EQUIPE"],
      meses_guarda: 12,
    },
    vagas: [],
    candidatos: [],
    candidaturas: [],
    contatos: [],
    eventos: [],
    emails: [],
    limpezas_lgpd: [],
  };

  const T = hoje(agoraReal);
  const S = segundaDoCiclo(T); // ciclo atual
  const P = somarDias(S, -28); // ciclo anterior
  const em = (dia: string, h: string) => new Date(juntarDiaHora(dia, h.padStart(5, "0")));

  const dadosVaga = {
    titulo: "Operador(a) de telemarketing",
    empresa: "MGCON" as const,
    quantidade: 3,
    salario: "Fixo + comissão (valores de exemplo)",
    remuneracao: "Fixo + comissão por venda + bonificação por meta",
    beneficios: "Vale-transporte, vale-refeição (exemplo)",
    horario: "Segunda a sexta, 8h às 17h (exemplo)",
    atribuicoes: "Ligações ativas pela discadora para leads de consórcio, apresentação das cartas e agendamento de vendas.",
    requisitos: "Ensino médio completo. Experiência com telemarketing é diferencial.",
    local: "Presencial — escritório MGCON",
    responsavel_nome: LETICIA,
    responsavel_email: "leticia@exemplo.com.br",
  };

  // ─── Ciclo anterior (encerrado) ──────────────────────────────────────────
  const anterior = salvarVaga(banco, null, dadosVaga, "Nicolas Okubo", em(P, "08:00"));
  mudarSituacaoVaga(banco, anterior.id, "ABERTA", P, em(P, "08:30"));

  const nomesAnt = [
    "Rafael Moreira Lima",
    "Juliana Castro Alves",
    "Thiago Barros Rocha",
    "Patrícia Gomes Silva",
    "Lucas Fernandes Reis",
    "Vanessa Duarte Melo",
    "Larissa Moura Campos",
    "Renato Pires Andrade",
  ];
  const ant = nomesAnt.map((nome, i) => {
    const quando = em(somarDias(P, i % 3), `${10 + i}:15`);
    const { candidatura } = inscrever(banco, pessoa(nome, 50 + i), anterior.id, null, null, quando);
    processarFila(banco, quando);
    return candidatura;
  });
  processarFila(banco, em(somarDias(P, 2), "20:00"));

  const triagemDia = somarDias(P, 2);
  const entrevistaDia = somarDias(P, 4); // sexta
  [0, 1, 2, 5, 6, 7].forEach((i) =>
    registrarTriagem(
      banco,
      ant[i].id,
      { notas: notasTriagem(7 + (i % 2)), comentario: "", decisao: "APROVADO", motivo: "" },
      LETICIA,
      em(triagemDia, `${9 + i}:00`)
    )
  );
  registrarTriagem(banco, ant[3].id, { notas: notasTriagem(3), comentario: "", decisao: "REPROVADO", motivo: "Horário incompatível" }, LETICIA, em(triagemDia, "15:00"));
  registrarTriagem(banco, ant[4].id, { notas: notasTriagem(2), comentario: "", decisao: "REPROVADO", motivo: "Trajeto inviável" }, LETICIA, em(triagemDia, "15:10"));

  const agendar = (i: number, h: string, quando: Date) =>
    registrarContato(
      banco,
      ant[i].id,
      {
        canal: "WHATSAPP",
        resultado: "AGENDADO",
        observacao: "",
        entrevista: {
          data_hora: juntarDiaHora(entrevistaDia, h),
          local: "",
          entrevistadores: "Leonardo Okubo, Luana Sousa",
          supervisora: "Supervisora da equipe",
        },
      },
      LETICIA,
      quando
    );
  registrarContato(banco, ant[0].id, { canal: "LIGACAO", resultado: "NAO_ATENDEU", observacao: "", entrevista: null }, LETICIA, em(somarDias(P, 3), "09:00"));
  agendar(0, "09:00", em(somarDias(P, 3), "11:00"));
  agendar(1, "10:00", em(somarDias(P, 3), "09:20"));
  agendar(2, "11:00", em(somarDias(P, 3), "09:40"));
  agendar(5, "14:00", em(somarDias(P, 3), "10:00"));
  agendar(6, "15:00", em(somarDias(P, 3), "10:20"));
  registrarContato(banco, ant[7].id, { canal: "WHATSAPP", resultado: "RECUSOU", observacao: "Já começou em outro lugar.", entrevista: null }, LETICIA, em(somarDias(P, 3), "10:40"));
  processarFila(banco, em(entrevistaDia, "08:00"));

  registrarAvaliacao(banco, ant[0].id, avaliacao(9, "APROVADO"), LEONARDO, em(entrevistaDia, "09:50"));
  registrarAvaliacao(banco, ant[1].id, avaliacao(8, "APROVADO"), LEONARDO, em(entrevistaDia, "10:50"));
  registrarAvaliacao(banco, ant[2].id, avaliacao(5, "REPROVADO"), LEONARDO, em(entrevistaDia, "11:50"));
  naoCompareceu(banco, ant[5].id, "Não respondeu no WhatsApp.", LETICIA, em(entrevistaDia, "14:40"));
  registrarAvaliacao(banco, ant[6].id, avaliacao(7, "RESERVA"), LEONARDO, em(entrevistaDia, "15:50"));

  const decisaoDia = somarDias(P, 7); // segunda da 2ª semana
  const quemDecidiu = "Leonardo, Rogerio, Luana e a supervisora";
  decidir(banco, ant[0].id, { resultado: "APROVADO", quem_decidiu: quemDecidiu, comentario: "", motivo: "" }, LEONARDO, em(decisaoDia, "10:00"));
  decidir(banco, ant[1].id, { resultado: "APROVADO", quem_decidiu: quemDecidiu, comentario: "", motivo: "" }, LEONARDO, em(decisaoDia, "10:05"));
  decidir(banco, ant[2].id, { resultado: "REPROVADO", quem_decidiu: quemDecidiu, comentario: "", motivo: "Perfil não aderente" }, LEONARDO, em(decisaoDia, "10:10"));
  decidir(banco, ant[6].id, { resultado: "RESERVA", quem_decidiu: quemDecidiu, comentario: "Boa candidata; vagas preenchidas.", motivo: "Vagas já preenchidas" }, LEONARDO, em(decisaoDia, "10:15"));

  const inicio = somarDias(P, 14);
  confirmarInicio(banco, ant[0].id, inicio, LETICIA, em(somarDias(P, 9), "10:00"));
  confirmarInicio(banco, ant[1].id, inicio, LETICIA, em(somarDias(P, 9), "11:00"));
  processarFila(banco, em(somarDias(P, 12), "18:00"));
  mudarSituacaoVaga(banco, anterior.id, "ENCERRADA", null, em(somarDias(P, 12), "18:00"));

  // ─── Ciclo atual ─────────────────────────────────────────────────────────
  const atual = salvarVaga(banco, null, dadosVaga, "Nicolas Okubo", em(S, "08:00"));
  mudarSituacaoVaga(banco, atual.id, "ABERTA", S, em(S, "08:30"));

  // Os passos do ciclo atual são espalhados entre a abertura e uma hora atrás,
  // para a ordem fazer sentido em qualquer dia em que o protótipo for aberto.
  const inicioJanela = em(S, "09:00").getTime();
  const fimJanela = agoraReal.getTime() - 60 * 60 * 1000;
  const passo = (f: number) => new Date(inicioJanela + (fimJanela - inicioJanela) * f);

  const nomesAtual = [
    "Diego Martins Lopes",
    "Eduarda Lima Souza",
    "Felipe Araújo Nunes",
    "Gabriela Rocha Mendes",
    "Henrique Batista Alves",
    "Isabela Cardoso Pinto",
    "João Victor Teixeira",
    "Mariana Freitas Costa",
    "Ana Paula Ribeiro",
    "Bruno Henrique Costa",
    "Camila Ferreira Santos",
  ];
  const at = nomesAtual.map((nome, i) => {
    const { candidatura } = inscrever(banco, pessoa(nome, i), atual.id, null, null, passo(i * 0.06));
    processarFila(banco, passo(i * 0.06));
    return candidatura;
  });
  // Larissa, que ficou na reserva do ciclo anterior, é chamada de novo pela equipe.
  const larissa = banco.candidatos.find((c) => c.nome === "Larissa Moura Campos")!;
  const larissaAgora = inscrever(
    banco,
    { ...pessoa(larissa.nome, 56), origem: larissa.origem, observacoes: "Reserva do ciclo anterior." },
    atual.id,
    null,
    LETICIA,
    passo(0.62)
  ).candidatura;
  processarFila(banco, passo(0.65));

  [0, 1, 2, 3, 4].forEach((i) =>
    registrarTriagem(
      banco,
      at[i].id,
      { notas: notasTriagem(7 + (i % 3)), comentario: "", decisao: "APROVADO", motivo: "" },
      LETICIA,
      passo(0.66 + i * 0.01)
    )
  );
  registrarTriagem(banco, at[6].id, { notas: notasTriagem(6), comentario: "", decisao: "APROVADO", motivo: "" }, LETICIA, passo(0.71));
  registrarTriagem(banco, larissaAgora.id, { notas: notasTriagem(8), comentario: "Já entrevistada no ciclo anterior.", decisao: "APROVADO", motivo: "" }, LETICIA, passo(0.72));
  registrarTriagem(banco, at[5].id, { notas: notasTriagem(3), comentario: "Mora em outra cidade.", decisao: "REPROVADO", motivo: "Trajeto inviável" }, LETICIA, passo(0.73));
  registrarTriagem(banco, at[7].id, { notas: notasTriagem(5), comentario: "", decisao: "RESERVA", motivo: "Perfil para vaga administrativa" }, LETICIA, passo(0.74));

  const amanha = proximoDiaUtil(T);
  const depois = proximoDiaUtil(T, 2);
  const marcar = (c: { id: string }, dia: string, h: string, quando: Date) =>
    registrarContato(
      banco,
      c.id,
      {
        canal: "WHATSAPP",
        resultado: "AGENDADO",
        observacao: "",
        entrevista: {
          data_hora: juntarDiaHora(dia, h),
          local: "",
          entrevistadores: "Leonardo Okubo, Rogerio Okubo",
          supervisora: "Supervisora da equipe",
        },
      },
      LETICIA,
      quando
    );

  registrarContato(banco, at[0].id, { canal: "LIGACAO", resultado: "NAO_ATENDEU", observacao: "Caixa postal.", entrevista: null }, LETICIA, passo(0.8));
  marcar(at[2], amanha, "09:30", passo(0.81));
  marcar(at[3], amanha, "10:30", passo(0.82));
  marcar(at[4], amanha, "14:00", passo(0.83));
  remarcarEntrevista(
    banco,
    at[4].id,
    {
      data_hora: juntarDiaHora(depois, "14:00"),
      local: "",
      entrevistadores: "Leonardo Okubo, Rogerio Okubo",
      supervisora: "Supervisora da equipe",
      motivo: "Pediu outro dia por causa do trabalho atual.",
    },
    LETICIA,
    passo(0.86)
  );
  marcar(larissaAgora, amanha, "11:30", passo(0.87));
  registrarContato(banco, at[6].id, { canal: "WHATSAPP", resultado: "SEM_INTERESSE", observacao: "Disse que vai continuar no emprego atual.", entrevista: null }, LETICIA, passo(0.9));
  processarFila(banco, passo(0.95));

  // ─── Vaga em rascunho ────────────────────────────────────────────────────
  salvarVaga(
    banco,
    null,
    {
      ...dadosVaga,
      titulo: "Auxiliar administrativo",
      empresa: "OKUBO",
      quantidade: 1,
      salario: "",
      remuneracao: "",
      beneficios: "",
      atribuicoes: "Apoio ao pós-vendas e ao administrativo: conferência de documentos, arquivo e cadastro no Polaris.",
      requisitos: "Ensino médio completo; pacote Office.",
    },
    "Nicolas Okubo",
    passo(0.97)
  );

  return banco;
}
