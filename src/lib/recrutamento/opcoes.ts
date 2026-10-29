/**
 * Rótulos, cores e listas do recrutamento — num lugar só, como o
 * `vendas-opcoes.ts` do Polaris. Opção nova entra aqui, com sua cor; nunca
 * espalhada pela tela.
 */

import type {
  CanalContato,
  Etapa,
  ModeloEmail,
  ResultadoContato,
  SituacaoEmail,
  SituacaoVaga,
} from "./tipos.ts";

export type CorBadge =
  | "verde"
  | "amarelo"
  | "laranja"
  | "vermelho"
  | "vermelho_escuro"
  | "neutro"
  | "azul";

/** As mesmas classes do Polaris, para a etiqueta ter a mesma cara lá e cá. */
export const CLASSES_BADGE: Record<CorBadge, string> = {
  verde: "bg-green-100 text-green-800",
  amarelo: "bg-amber-100 text-amber-800",
  laranja: "bg-orange-100 text-orange-800",
  vermelho: "bg-red-100 text-red-700",
  vermelho_escuro: "bg-red-700 text-white",
  neutro: "bg-gray-100 text-gray-700 border border-gray-200",
  azul: "bg-blue-100 text-blue-800",
};

export const ETAPAS: Record<
  Etapa,
  { rotulo: string; cor: CorBadge; aguardando: string; encerrada: boolean }
> = {
  INSCRITO: {
    rotulo: "Inscrito",
    cor: "neutro",
    aguardando: "Aguardando triagem",
    encerrada: false,
  },
  TRIAGEM_APROVADA: {
    rotulo: "Aprovado na triagem",
    cor: "azul",
    aguardando: "Aguardando contato para agendar",
    encerrada: false,
  },
  ENTREVISTA_AGENDADA: {
    rotulo: "Entrevista agendada",
    cor: "amarelo",
    aguardando: "Aguardando a entrevista",
    encerrada: false,
  },
  ENTREVISTADO: {
    rotulo: "Entrevistado",
    cor: "laranja",
    aguardando: "Aguardando decisão da gestão",
    encerrada: false,
  },
  APROVADO: {
    rotulo: "Aprovado",
    cor: "verde",
    aguardando: "Aguardando confirmação do candidato",
    encerrada: false,
  },
  ADMISSAO: {
    rotulo: "Em admissão",
    cor: "verde",
    aguardando: "Com o RH (Marco Aurelio)",
    encerrada: false,
  },
  REPROVADO: {
    rotulo: "Reprovado",
    cor: "vermelho",
    aguardando: "Encerrada",
    encerrada: true,
  },
  DESISTIU: {
    rotulo: "Desistiu",
    cor: "neutro",
    aguardando: "Encerrada",
    encerrada: true,
  },
  RESERVA: {
    rotulo: "Banco de reserva",
    cor: "azul",
    aguardando: "Guardado para outra oportunidade",
    encerrada: true,
  },
};

/** Ordem do funil: quem chega numa etapa passou por todas as anteriores. */
export const FUNIL: Etapa[] = [
  "INSCRITO",
  "TRIAGEM_APROVADA",
  "ENTREVISTA_AGENDADA",
  "ENTREVISTADO",
  "APROVADO",
  "ADMISSAO",
];

export const ENCERRADAS: Etapa[] = ["REPROVADO", "DESISTIU", "RESERVA"];

export const SITUACOES_VAGA: Record<SituacaoVaga, { rotulo: string; cor: CorBadge }> = {
  RASCUNHO: { rotulo: "Rascunho", cor: "neutro" },
  ABERTA: { rotulo: "Aberta", cor: "verde" },
  PAUSADA: { rotulo: "Pausada", cor: "amarelo" },
  ENCERRADA: { rotulo: "Encerrada", cor: "neutro" },
};

export const ORIGENS = [
  "Landing page",
  "Instagram",
  "Facebook",
  "Indeed",
  "Indicação",
  "WhatsApp",
  "Outro",
];

export const CANAIS: Record<CanalContato, string> = {
  WHATSAPP: "WhatsApp",
  LIGACAO: "Ligação",
  EMAIL: "E-mail",
};

/**
 * O que aconteceu no contato. `encerra` diz se a candidatura acaba ali;
 * `agenda` diz se o contato marcou a entrevista.
 */
export const RESULTADOS_CONTATO: Record<
  ResultadoContato,
  { rotulo: string; cor: CorBadge; encerra: boolean; agenda: boolean }
> = {
  NAO_ATENDEU: { rotulo: "Não atendeu", cor: "neutro", encerra: false, agenda: false },
  RECADO: { rotulo: "Deixou recado", cor: "neutro", encerra: false, agenda: false },
  NUMERO_INVALIDO: { rotulo: "Número errado", cor: "laranja", encerra: false, agenda: false },
  AGENDADO: { rotulo: "Entrevista marcada", cor: "verde", encerra: false, agenda: true },
  RECUSOU: { rotulo: "Recusou a entrevista", cor: "vermelho", encerra: true, agenda: false },
  SEM_INTERESSE: { rotulo: "Não tem mais interesse", cor: "vermelho", encerra: true, agenda: false },
};

/**
 * Notas da triagem do currículo (0 a 10). **Proposta** — o documento do
 * processo diz "atribuir notas da filtragem" sem dizer quais. Ajustar com a
 * Letícia e o Leonardo antes de entrar no Polaris.
 */
export const CRITERIOS_TRIAGEM = [
  {
    chave: "experiencia",
    rotulo: "Experiência com a função",
    ajuda: "Telemarketing, vendas, atendimento — quanto mais perto da rotina, maior a nota.",
  },
  {
    chave: "disponibilidade",
    rotulo: "Disponibilidade de horário",
    ajuda: "Consegue cumprir o horário da vaga sem arranjo.",
  },
  {
    chave: "trajeto",
    rotulo: "Trajeto até o escritório",
    ajuda: "Distância e condução. Trajeto difícil é o primeiro motivo de desistência.",
  },
  {
    chave: "comunicacao",
    rotulo: "Comunicação escrita",
    ajuda: "Clareza e cuidado no currículo e no formulário.",
  },
];

/**
 * Os 7 critérios da ficha de avaliação de entrevista (versão Operador de
 * Telemarketing), na ordem da ficha impressa em `09 - Anexos`.
 */
export const CRITERIOS_ENTREVISTA = [
  { chave: "comunicacao", rotulo: "Comunicação e dicção", ajuda: "Fala claro e no ritmo certo; dá para entender bem do outro lado da linha." },
  { chave: "clareza", rotulo: "Clareza nas respostas", ajuda: "Responde o que foi perguntado, sem enrolar nem fugir do assunto." },
  { chave: "postura", rotulo: "Postura e presença", ajuda: "Apresentação, firmeza, olha nos olhos, energia na conversa." },
  { chave: "trajetoria", rotulo: "Coerência da trajetória", ajuda: "O histórico bate e os motivos de saída fazem sentido quando você aprofunda." },
  {
    chave: "rotina",
    rotulo: "Reação à rotina real",
    ajuda: "Conte e observe: discadora, uma ligação atrás da outra, a maioria diz não ou desliga. Reage com naturalidade ou se assusta?",
  },
  {
    chave: "ganho",
    rotulo: "Reação ao modelo de ganho",
    ajuda: "Conte e observe: fixo + comissão sem teto + bonificação por meta. Trabalha bem com variável ou quer só a segurança do fixo?",
  },
  { chave: "motivacao", rotulo: "Motivação e permanência", ajuda: "Por que esta vaga, o que o faria ficar e o que já o fez sair de empregos parecidos." },
];

/**
 * Parte 1 da ficha de avaliação (dados do candidato), na ordem do papel.
 * `simnao` vira Sim/Não com o complemento; `obrigatoria` é só o que pesa na
 * decisão sobre a rotina da vaga — o resto o papel também deixa em branco.
 */
export const DADOS_FICHA: {
  chave: string;
  rotulo: string;
  tipo: "texto" | "simnao";
  detalhe?: string;
  obrigatoria?: boolean;
}[] = [
  { chave: "idade", rotulo: "Idade", tipo: "texto" },
  { chave: "estado_civil", rotulo: "Estado civil", tipo: "texto" },
  { chave: "bairro_cidade", rotulo: "Bairro e cidade onde mora", tipo: "texto" },
  { chave: "filhos", rotulo: "Tem filhos?", tipo: "simnao", detalhe: "quantos / idades" },
  { chave: "rede_apoio", rotulo: "Rede de apoio (quem)", tipo: "texto" },
  { chave: "vale_transporte", rotulo: "Usa vale-transporte?", tipo: "simnao", detalhe: "quantos por dia" },
  { chave: "deslocamento", rotulo: "Tempo de deslocamento", tipo: "texto" },
  { chave: "ultimo_emprego", rotulo: "Último emprego e motivo da saída", tipo: "texto" },
  { chave: "exp_vendas", rotulo: "Experiência com vendas?", tipo: "simnao", detalhe: "quanto tempo / onde", obrigatoria: true },
  { chave: "exp_telemarketing", rotulo: "Experiência com telemarketing?", tipo: "simnao", detalhe: "quanto tempo / onde", obrigatoria: true },
  { chave: "exp_consorcio", rotulo: "Já trabalhou com consórcio?", tipo: "simnao", detalhe: "onde", obrigatoria: true },
  { chave: "disponivel", rotulo: "Disponível no horário da vaga?", tipo: "simnao", detalhe: "se não, por quê", obrigatoria: true },
  { chave: "pretensao", rotulo: "Pretensão salarial", tipo: "texto" },
  { chave: "inicio", rotulo: "Disponibilidade de início", tipo: "texto" },
];

/**
 * Quem aparece para marcar no fechamento da ficha. No Polaris, sai da lista de
 * usuários (diretoria/master e supervisoras); aqui, dos nomes do papel.
 */
export const ENTREVISTADORES = ["Leonardo Okubo", "Rogerio Okubo", "Luana Sousa", "Nicolas Okubo"];
export const SUPERVISORAS = ["Cristiane Siqueira", "Carol Pereira", "Michele Lima"];

export const MOTIVOS_REPROVACAO = [
  "Sem experiência para a função",
  "Horário incompatível",
  "Trajeto inviável",
  "Perfil não aderente",
  "Pretensão salarial acima",
  "Vagas já preenchidas",
];

export const MOTIVOS_DESISTENCIA = [
  "Recusou a entrevista",
  "Sem interesse",
  "Não compareceu à entrevista",
  "Não confirmou o início",
  "Aceitou outra proposta",
  "Sem retorno após várias tentativas",
];

export const MODELOS_EMAIL: Record<ModeloEmail, { rotulo: string; quando: string }> = {
  CONFIRMACAO_CANDIDATURA: {
    rotulo: "Confirmação de candidatura",
    quando: "Na hora da inscrição",
  },
  ENTREVISTA_AGENDADA: {
    rotulo: "Entrevista marcada",
    quando: "Na hora em que a entrevista é marcada ou remarcada",
  },
  LEMBRETE_ENTREVISTA: {
    rotulo: "Lembrete de entrevista (candidato)",
    quando: "Na véspera, no horário configurado",
  },
  LEMBRETE_ENTREVISTA_EQUIPE: {
    rotulo: "Lembrete de entrevista (equipe)",
    quando: "Na véspera, para a responsável e os master",
  },
  APROVADO: {
    rotulo: "Aprovação",
    quando: "Na hora da decisão",
  },
  REPROVADO_TRIAGEM: {
    rotulo: "Negativa — triagem",
    quando: "Dias depois da reprovação (configurável, padrão 2)",
  },
  REPROVADO_ENTREVISTA: {
    rotulo: "Negativa — pós-entrevista",
    quando: "Dias depois da reprovação (configurável, padrão 2)",
  },
};

export const SITUACOES_EMAIL: Record<SituacaoEmail, { rotulo: string; cor: CorBadge }> = {
  PENDENTE: { rotulo: "Agendado", cor: "amarelo" },
  ENVIANDO: { rotulo: "Enviando", cor: "azul" },
  ENVIADO: { rotulo: "Enviado", cor: "verde" },
  CANCELADO: { rotulo: "Cancelado", cor: "neutro" },
  FALHOU: { rotulo: "Falhou", cor: "vermelho" },
};
