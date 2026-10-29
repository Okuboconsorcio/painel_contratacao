/**
 * Formato dos dados do recrutamento.
 *
 * Cada tipo aqui corresponde a uma tabela do schema `polaris` no SQL de
 * integração (`supabase/recrutamento.sql`). Os nomes de campo são os mesmos das
 * colunas — assim, quando o painel entrar no Polaris, troca-se só o arquivo
 * `dados.ts` (que hoje grava num arquivo local) por consultas ao Supabase, e as
 * telas continuam iguais.
 *
 * Datas: `AAAA-MM-DD` quando é dia (início, abertura da vaga); ISO completo
 * quando é momento (inscrição, entrevista, envio de e-mail).
 */

export type Empresa = "MGCON" | "OKUBO";

export type SituacaoVaga = "RASCUNHO" | "ABERTA" | "PAUSADA" | "ENCERRADA";

export type Vaga = {
  id: string;
  /** Usado no link da landing page: .../vagas/<slug> */
  slug: string;
  titulo: string;
  empresa: Empresa;
  quantidade: number;
  salario: string;
  /** Fixo + comissão + bonificação, por exemplo. */
  remuneracao: string;
  beneficios: string;
  horario: string;
  atribuicoes: string;
  requisitos: string;
  /** "Conta ponto": o que ajuda mas não é exigido (aparece na página de vagas). */
  diferenciais: string;
  /** Uso interno — não vai para a página pública (endereço só depois de marcar a entrevista). */
  local: string;
  /** Quem faz a triagem e recebe os lembretes de entrevista. */
  responsavel_nome: string;
  responsavel_email: string;
  situacao: SituacaoVaga;
  /** Dia 1 do ciclo de 12 dias. Deveria ser sempre uma segunda-feira. */
  aberta_em: string | null;
  encerrada_em: string | null;
  criado_em: string;
  criado_por: string;
};

export type Arquivo = {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
};

export type Candidato = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  bairro: string;
  data_nascimento: string | null;
  /** Por onde chegou: landing page, Instagram, indicação… */
  origem: string;
  /** O que a pessoa contou de experiência no formulário. */
  resumo: string;
  observacoes: string;
  curriculo: Arquivo | null;
  /** Quando aceitou guardar os dados (LGPD). Sem isso, não entra no banco. */
  consentimento_em: string | null;
  criado_em: string;
  /** `null` quando veio sozinho pela landing page. */
  criado_por: string | null;
};

/**
 * As etapas do processo. As seis primeiras são o caminho de quem avança; as três
 * últimas encerram a candidatura (e guardam em `etapa_encerramento` onde ela
 * estava, para poder desfazer).
 */
export type Etapa =
  | "INSCRITO"
  | "TRIAGEM_APROVADA"
  | "ENTREVISTA_AGENDADA"
  | "ENTREVISTADO"
  | "APROVADO"
  | "ADMISSAO"
  | "REPROVADO"
  | "DESISTIU"
  | "RESERVA";

export type Triagem = {
  notas: Record<string, number>;
  /** Média das notas, com uma casa. */
  nota_geral: number;
  comentario: string;
  decisao: "APROVADO" | "REPROVADO" | "RESERVA";
  por: string;
  em: string;
};

export type Entrevista = {
  data_hora: string;
  local: string;
  entrevistadores: string;
  supervisora: string;
  agendada_por: string;
  agendada_em: string;
  /** Quantas vezes foi remarcada — candidato que remarca três vezes diz algo. */
  remarcacoes: number;
};

/**
 * Uma resposta da parte 1 da ficha. Pergunta de sim/não guarda "SIM", "NAO" ou
 * "" em `valor` e o complemento ("quanto tempo / onde") em `detalhe`.
 */
export type RespostaFicha = { valor: string; detalhe: string };

export type Avaliacao = {
  /** Parte 1 da ficha — dados do candidato, perguntados no começo. Chaves em `DADOS_FICHA`. */
  dados: Record<string, RespostaFicha>;
  /** As 7 notas da ficha de entrevista, com a justificativa de cada uma. */
  notas: Record<string, { nota: number; justificativa: string }>;
  /** Exatamente 3 de cada, com exemplo concreto da entrevista. */
  pontos_positivos: string[];
  pontos_atencao: string[];
  realizada_por: string[];
  supervisora: string;
  nota_entrevistador: number;
  nota_supervisora: number | null;
  parecer: "APROVADO" | "REPROVADO" | "RESERVA";
  /** A ficha em papel, escaneada. */
  ficha: Arquivo | null;
  por: string;
  em: string;
};

export type Decisao = {
  resultado: "APROVADO" | "REPROVADO" | "RESERVA";
  quem_decidiu: string;
  comentario: string;
  por: string;
  em: string;
};

export type Candidatura = {
  id: string;
  candidato_id: string;
  vaga_id: string;
  etapa: Etapa;
  /** Onde estava quando foi encerrada — para mostrar e para desfazer. */
  etapa_encerramento: Etapa | null;
  motivo_encerramento: string;
  triagem: Triagem | null;
  entrevista: Entrevista | null;
  avaliacao: Avaliacao | null;
  decisao: Decisao | null;
  /** Segunda-feira em que começa, quando confirmou. */
  data_inicio: string | null;
  confirmado_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type CanalContato = "WHATSAPP" | "LIGACAO" | "EMAIL";

export type ResultadoContato =
  | "NAO_ATENDEU"
  | "RECADO"
  | "AGENDADO"
  | "RECUSOU"
  | "SEM_INTERESSE"
  | "NUMERO_INVALIDO";

export type Contato = {
  id: string;
  candidatura_id: string;
  canal: CanalContato;
  resultado: ResultadoContato;
  observacao: string;
  por: string;
  em: string;
};

/** Linha do histórico: tudo o que acontece com uma candidatura fica aqui. */
export type Evento = {
  id: string;
  candidato_id: string;
  candidatura_id: string | null;
  tipo: string;
  de: Etapa | null;
  para: Etapa | null;
  texto: string;
  por: string;
  em: string;
};

export type ModeloEmail =
  | "CONFIRMACAO_CANDIDATURA"
  | "ENTREVISTA_AGENDADA"
  | "LEMBRETE_ENTREVISTA"
  | "LEMBRETE_ENTREVISTA_EQUIPE"
  | "APROVADO"
  | "REPROVADO_TRIAGEM"
  | "REPROVADO_ENTREVISTA";

/** `ENVIANDO`: reservado para um envio (no Supabase), para não sair duas vezes. */
export type SituacaoEmail = "PENDENTE" | "ENVIANDO" | "ENVIADO" | "CANCELADO" | "FALHOU";

export type Email = {
  id: string;
  candidato_id: string;
  candidatura_id: string | null;
  modelo: ModeloEmail;
  para: string[];
  assunto: string;
  /** Parágrafos do corpo, já com os dados do candidato preenchidos. */
  linhas: string[];
  agendado_para: string;
  situacao: SituacaoEmail;
  enviado_em: string | null;
  motivo: string;
  criado_em: string;
};

export type Configuracao = {
  remetente: string;
  /** Quem recebe o lembrete de entrevista junto com a responsável. */
  emails_master: string[];
  /** Espera antes de mandar a negativa. Dá tempo de desfazer um engano. */
  dias_espera_negativa: number;
  /** Hora do lembrete na véspera da entrevista. */
  hora_lembrete: string;
  endereco_entrevista: string;
  /** Só estes modelos entram na fila; os outros nem são agendados. */
  emails_ligados: ModeloEmail[];
  /** Quanto tempo o currículo de quem não foi contratado fica no banco (LGPD). */
  meses_guarda: number;
};

export type Banco = {
  versao: 1;
  config: Configuracao;
  vagas: Vaga[];
  candidatos: Candidato[];
  candidaturas: Candidatura[];
  contatos: Contato[];
  eventos: Evento[];
  emails: Email[];
  /** Cada limpeza LGPD que apagou alguém — só data e quantidade, sem nome. */
  limpezas_lgpd: { em: string; candidatos: number }[];
};

/** Resposta padrão das ações de tela: deu certo, ou o porquê de não ter dado. */
export type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };
