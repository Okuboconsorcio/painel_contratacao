-- Painel de contratação (recrutamento) — estrutura.
--
-- Sistema SEPARADO do Polaris (decisão do Nicolas, 29/10/2026), no mesmo
-- projeto Supabase (portal-okubo), em schema próprio. Não toca em nada do
-- schema `polaris`, do `public` nem de outro projeto.
--
-- As colunas têm os MESMOS nomes dos campos em `src/lib/recrutamento/tipos.ts`:
-- o app lê a linha e usa direto, sem tradução. O que é objeto no app
-- (triagem, entrevista, avaliação, decisão, arquivo) é jsonb aqui.
--
-- Os ids são texto (`cand_…`, `ctr_…`) porque nascem no app, no motor do
-- processo, antes de gravar.
--
-- Para desfazer tudo: `drop schema recrutamento cascade;` e apagar o bucket
-- `recrutamento` (ver 20261029200100_recrutamento_seguranca.sql).

create schema if not exists recrutamento;

-- Quem entra no painel. O login é o do Supabase Auth (o mesmo do Polaris);
-- sem linha aqui, não entra.
create table recrutamento.usuario (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  email      text not null,
  papel      text not null check (papel in ('master', 'diretoria', 'gestor_rh', 'suporte_administrativo')),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create table recrutamento.vaga (
  id                text primary key,
  slug              text not null unique,
  titulo            text not null,
  empresa           text not null check (empresa in ('MGCON', 'OKUBO')),
  quantidade        integer not null check (quantidade > 0),
  salario           text not null default '',
  remuneracao       text not null default '',
  beneficios        text not null default '',
  horario           text not null default '',
  atribuicoes       text not null default '',
  requisitos        text not null default '',
  local             text not null default '',
  responsavel_nome  text not null default '',
  responsavel_email text not null default '',
  situacao          text not null check (situacao in ('RASCUNHO', 'ABERTA', 'PAUSADA', 'ENCERRADA')),
  aberta_em         date,
  encerrada_em      date,
  criado_em         timestamptz not null,
  criado_por        text not null
);

-- O banco de currículos.
create table recrutamento.candidato (
  id               text primary key,
  nome             text not null,
  email            text not null,
  telefone         text not null,
  cidade           text not null default '',
  bairro           text not null default '',
  data_nascimento  date,
  origem           text not null default '',
  resumo           text not null default '',
  observacoes      text not null default '',
  curriculo        jsonb,                          -- {id, nome, tipo, tamanho}; arquivo no bucket `recrutamento`
  consentimento_em timestamptz not null,           -- LGPD: sem aceite não entra
  criado_em        timestamptz not null,
  criado_por       text
);
-- A mesma pessoa não vira duas fichas (o motor já procura; isto segura corrida
-- entre duas inscrições ao mesmo tempo).
create unique index candidato_email_unico on recrutamento.candidato (lower(email));
create unique index candidato_telefone_unico on recrutamento.candidato (telefone);

create table recrutamento.candidatura (
  id                  text primary key,
  candidato_id        text not null references recrutamento.candidato(id),
  vaga_id             text not null references recrutamento.vaga(id),
  etapa               text not null check (etapa in ('INSCRITO', 'TRIAGEM_APROVADA', 'ENTREVISTA_AGENDADA', 'ENTREVISTADO',
                                                     'APROVADO', 'ADMISSAO', 'REPROVADO', 'DESISTIU', 'RESERVA')),
  etapa_encerramento  text,
  motivo_encerramento text not null default '',
  triagem             jsonb,
  entrevista          jsonb,
  avaliacao           jsonb,                       -- ficha de avaliação (partes 1 a 4)
  decisao             jsonb,
  -- Segunda é o padrão, mas o dia pode mudar (29/10): só não pode fim de semana.
  data_inicio         date check (data_inicio is null or extract(isodow from data_inicio) between 1 and 5),
  confirmado_em       timestamptz,
  criado_em           timestamptz not null,
  atualizado_em       timestamptz not null
);
create index candidatura_candidato on recrutamento.candidatura (candidato_id);
create index candidatura_vaga on recrutamento.candidatura (vaga_id, etapa);
-- Uma candidatura em andamento por pessoa por vaga.
create unique index candidatura_uma_ativa on recrutamento.candidatura (candidato_id, vaga_id)
  where etapa not in ('REPROVADO', 'DESISTIU', 'RESERVA');

create table recrutamento.contato (
  id             text primary key,
  candidatura_id text not null references recrutamento.candidatura(id),
  canal          text not null check (canal in ('WHATSAPP', 'LIGACAO', 'EMAIL')),
  resultado      text not null check (resultado in ('NAO_ATENDEU', 'RECADO', 'AGENDADO', 'RECUSOU', 'SEM_INTERESSE', 'NUMERO_INVALIDO')),
  observacao     text not null default '',
  por            text not null,
  em             timestamptz not null
);
create index contato_candidatura on recrutamento.contato (candidatura_id);

-- O histórico: tudo o que acontece com a candidatura.
create table recrutamento.evento (
  id             text primary key,
  candidato_id   text not null references recrutamento.candidato(id),
  candidatura_id text references recrutamento.candidatura(id),
  tipo           text not null,
  de             text,
  para           text,
  texto          text not null,
  por            text not null,
  em             timestamptz not null
);
create index evento_candidatura on recrutamento.evento (candidatura_id, em);
create index evento_candidato on recrutamento.evento (candidato_id);

-- A fila de e-mails: nada sai na hora em que a tela grava; sai quando chega o horário.
create table recrutamento.email (
  id             text primary key,
  candidato_id   text not null references recrutamento.candidato(id),
  candidatura_id text references recrutamento.candidatura(id),
  modelo         text not null,
  para           text[] not null,
  assunto        text not null,
  linhas         text[] not null,
  agendado_para  timestamptz not null,
  situacao       text not null check (situacao in ('PENDENTE', 'ENVIANDO', 'ENVIADO', 'CANCELADO', 'FALHOU')),
  enviado_em     timestamptz,
  motivo         text not null default '',
  criado_em      timestamptz not null
);
create index email_fila on recrutamento.email (situacao, agendado_para);
create index email_candidato on recrutamento.email (candidato_id);

-- Configuração: uma linha só. Guardada inteira em jsonb porque o app lê e grava
-- o objeto todo (remetente, e-mails ligados, prazo LGPD…).
create table recrutamento.config (
  id    boolean primary key default true check (id),
  dados jsonb not null
);

-- Cada limpeza LGPD que apagou alguém: só data e quantidade, nunca nome.
create table recrutamento.limpeza_lgpd (
  id         bigint generated always as identity primary key,
  em         timestamptz not null,
  candidatos integer not null check (candidatos > 0)
);

-- Configuração inicial — as decisões do Nicolas de 29/10.
insert into recrutamento.config (dados) values (jsonb_build_object(
  'remetente', 'Recrutamento MGCON',
  'emails_master', jsonb_build_array(),
  'dias_espera_negativa', 2,
  'hora_lembrete', '09:00',
  'endereco_entrevista', 'R. Cabo Diogo Oliver, 536 - Vila Mogilar - SP, 08773-000',
  'emails_ligados', jsonb_build_array('ENTREVISTA_AGENDADA', 'LEMBRETE_ENTREVISTA', 'LEMBRETE_ENTREVISTA_EQUIPE'),
  'meses_guarda', 12
));
