-- ═══════════════════════════════════════════════════════════════════════════
-- Recrutamento — estrutura para o schema `polaris` (Supabase portal-okubo)
--
-- RASCUNHO. NÃO FOI APLICADO NEM TESTADO NO BANCO.
-- Escrito junto com o protótipo `C:\dev\painel-contratacao` (29/10/2026) para
-- mostrar como os dados do protótipo viram tabelas. Antes de aplicar:
--   1. revisar com o Nicolas (o Polaris está em produção, com dados reais);
--   2. virar uma migração nova no repositório do Polaris (nunca alterar migração aplicada);
--   3. confirmar a matriz de permissões (proposta, ver final do arquivo);
--   4. escrever as funções de passo que estão listadas no final como "a fazer"
--      e testá-las com os mesmos casos de `scripts/conferir-regras.mts`.
--
-- Desenho, igual ao resto do Polaris:
--   - leitura direta pelas tabelas, travada por RLS com pode('recrutamento','ver');
--   - NENHUMA escrita direta: toda mudança de etapa passa por função
--     `security definer` que confere pode() por dentro e grava o histórico —
--     como `definir_status_auditoria` faz com a auditoria.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Vagas ─────────────────────────────────────────────────────────────────
create table polaris.rh_vagas (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,           -- código usado pela landing page
  titulo             text not null,
  empresa            text not null check (empresa in ('MGCON', 'OKUBO')),
  quantidade         smallint not null default 1 check (quantidade > 0),
  salario            text not null default '',
  remuneracao        text not null default '',
  beneficios         text not null default '',
  horario            text not null default '',
  atribuicoes        text not null default '',
  requisitos         text not null default '',
  local              text not null default '',
  responsavel_id     uuid references polaris.usuarios(id), -- quem faz a triagem (Letícia)
  situacao           text not null default 'RASCUNHO'
                     check (situacao in ('RASCUNHO', 'ABERTA', 'PAUSADA', 'ENCERRADA')),
  aberta_em          date,                            -- dia 1 do ciclo de 12 dias
  encerrada_em       date,
  criado_em          timestamptz not null default now(),
  criado_por         uuid references polaris.usuarios(id),
  -- Regra 1 do processo: vaga aberta precisa de cargo, salário, benefícios, horário e atribuições.
  constraint rh_vagas_aberta_completa check (
    situacao = 'RASCUNHO'
    or (salario <> '' and beneficios <> '' and horario <> '' and atribuicoes <> '')
  )
);

-- ─── Banco de currículos (a pessoa) ────────────────────────────────────────
create table polaris.rh_candidatos (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  email              text not null,
  telefone           text not null,                   -- só dígitos
  cidade             text not null default '',
  bairro             text not null default '',
  data_nascimento    date,
  origem             text not null default 'Outro',
  resumo             text not null default '',
  observacoes        text not null default '',
  curriculo_caminho  text,                            -- bucket privado `rh`, prefixo `candidatos/<id>/`
  curriculo_nome     text,
  consentimento_em   timestamptz not null,            -- LGPD: sem aceite, não entra
  criado_em          timestamptz not null default now(),
  criado_por         uuid references polaris.usuarios(id) -- null = veio pela landing page
);
-- A mesma pessoa não vira duas fichas.
create unique index rh_candidatos_email on polaris.rh_candidatos (lower(email));
create unique index rh_candidatos_telefone on polaris.rh_candidatos (telefone);

-- ─── Candidatura (a pessoa numa vaga) ──────────────────────────────────────
create table polaris.rh_candidaturas (
  id                  uuid primary key default gen_random_uuid(),
  candidato_id        uuid not null references polaris.rh_candidatos(id) on delete cascade,
  vaga_id             uuid not null references polaris.rh_vagas(id),
  etapa               text not null default 'INSCRITO' check (etapa in (
                        'INSCRITO', 'TRIAGEM_APROVADA', 'ENTREVISTA_AGENDADA', 'ENTREVISTADO',
                        'APROVADO', 'ADMISSAO', 'REPROVADO', 'DESISTIU', 'RESERVA')),
  etapa_encerramento  text,                           -- onde estava quando encerrou (para desfazer)
  motivo_encerramento text not null default '',

  -- Triagem (Letícia)
  triagem_notas       jsonb,                          -- {"experiencia": 8, "disponibilidade": 9, ...}
  triagem_nota        numeric(3,1),
  triagem_comentario  text,
  triagem_decisao     text check (triagem_decisao in ('APROVADO', 'REPROVADO', 'RESERVA')),
  triagem_por         uuid references polaris.usuarios(id),
  triagem_em          timestamptz,

  -- Entrevista marcada
  entrevista_em       timestamptz,
  entrevista_local    text,
  entrevistadores     text,
  supervisora         text,
  remarcacoes         smallint not null default 0,

  -- Ficha de avaliação (igual ao papel v1): parte 1, os 7 critérios, 3+3 pontos, fechamento
  avaliacao_dados     jsonb,                          -- parte 1: {"exp_vendas": {"valor": "SIM", "detalhe": "1 ano"}, ...}
  avaliacao_notas     jsonb,                          -- {"comunicacao": {"nota": 8, "justificativa": "..."}, ...}
  avaliacao_positivos text[] check (avaliacao_positivos is null or cardinality(avaliacao_positivos) = 3),
  avaliacao_atencao   text[] check (avaliacao_atencao is null or cardinality(avaliacao_atencao) = 3),
  realizada_por       text[],
  avaliacao_supervisora text,
  nota_entrevistador  numeric(3,1),
  nota_supervisora    numeric(3,1),
  parecer             text check (parecer in ('APROVADO', 'REPROVADO', 'RESERVA')),
  ficha_caminho       text,                           -- ficha escaneada, bucket `rh`
  avaliacao_por       uuid references polaris.usuarios(id),
  avaliacao_em        timestamptz,

  -- Decisão da gestão (regra 3: com a supervisora)
  decisao             text check (decisao in ('APROVADO', 'REPROVADO', 'RESERVA')),
  decisao_quem        text,
  decisao_comentario  text,
  decisao_por         uuid references polaris.usuarios(id),
  decisao_em          timestamptz,

  -- Confirmação e passagem para a admissão
  data_inicio         date check (data_inicio is null or extract(isodow from data_inicio) between 1 and 5), -- dia útil; segunda é o padrão, mas pode mudar (29/10)
  confirmado_em       timestamptz,
  rh_processo_id      uuid references polaris.rh_processos(id), -- a Admissão aberta para o colaborador

  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
-- Uma candidatura em andamento por pessoa por vaga.
create unique index rh_candidaturas_uma_ativa on polaris.rh_candidaturas (candidato_id, vaga_id)
  where etapa not in ('REPROVADO', 'DESISTIU', 'RESERVA');
create index rh_candidaturas_etapa on polaris.rh_candidaturas (vaga_id, etapa);

-- ─── Contatos (todo contato, inclusive "não atendeu") ──────────────────────
create table polaris.rh_contatos_candidato (
  id              uuid primary key default gen_random_uuid(),
  candidatura_id  uuid not null references polaris.rh_candidaturas(id) on delete cascade,
  canal           text not null check (canal in ('WHATSAPP', 'LIGACAO', 'EMAIL')),
  resultado       text not null check (resultado in (
                    'NAO_ATENDEU', 'RECADO', 'AGENDADO', 'RECUSOU', 'SEM_INTERESSE', 'NUMERO_INVALIDO')),
  observacao      text not null default '',
  por             uuid references polaris.usuarios(id),
  em              timestamptz not null default now()
);

-- ─── Histórico da candidatura ──────────────────────────────────────────────
-- Separado de `polaris.historico` porque o texto aqui é para a tela do
-- recrutamento ("Contato por WhatsApp: entrevista marcada"), não um diff de colunas.
create table polaris.rh_eventos_candidatura (
  id              uuid primary key default gen_random_uuid(),
  candidato_id    uuid not null references polaris.rh_candidatos(id) on delete cascade,
  candidatura_id  uuid references polaris.rh_candidaturas(id) on delete cascade,
  tipo            text not null,                      -- INSCRICAO, ETAPA, CONTATO, REMARCACAO, FICHA
  de              text,
  para            text,
  texto           text not null,
  por             uuid references polaris.usuarios(id), -- null = landing page
  em              timestamptz not null default now()
);
create index rh_eventos_candidatura_idx on polaris.rh_eventos_candidatura (candidatura_id, em);

-- ─── Fila de e-mails ───────────────────────────────────────────────────────
-- Nada é enviado na hora em que a tela grava: entra aqui com o horário certo.
-- Uma rota do Polaris chamada pelo agendador da Vercel (a cada 15 min) envia os
-- PENDENTES vencidos com `enviarEmail` (src/lib/email.ts). Mudou a etapa antes?
-- A função do passo cancela o pendente — é assim que a negativa de 2 dias pode
-- ser desfeita.
create table polaris.rh_emails_candidato (
  id              uuid primary key default gen_random_uuid(),
  candidato_id    uuid not null references polaris.rh_candidatos(id) on delete cascade,
  candidatura_id  uuid references polaris.rh_candidaturas(id) on delete cascade,
  modelo          text not null check (modelo in (
                    'CONFIRMACAO_CANDIDATURA', 'ENTREVISTA_AGENDADA', 'LEMBRETE_ENTREVISTA',
                    'LEMBRETE_ENTREVISTA_EQUIPE', 'APROVADO', 'REPROVADO_TRIAGEM', 'REPROVADO_ENTREVISTA')),
  para            text[] not null,
  assunto         text not null,
  corpo           text[] not null,
  agendado_para   timestamptz not null,
  situacao        text not null default 'PENDENTE' check (situacao in ('PENDENTE', 'ENVIADO', 'CANCELADO', 'FALHOU')),
  enviado_em      timestamptz,
  motivo          text not null default '',
  criado_em       timestamptz not null default now()
);
create index rh_emails_fila on polaris.rh_emails_candidato (agendado_para) where situacao = 'PENDENTE';

-- ─── Configuração (uma linha) ──────────────────────────────────────────────
create table polaris.rh_recrutamento_config (
  id                   boolean primary key default true check (id), -- garante linha única
  remetente            text not null,
  emails_master        text[] not null default '{}',
  dias_espera_negativa smallint not null default 2 check (dias_espera_negativa between 0 and 10),
  hora_lembrete        time not null default '09:00',
  endereco_entrevista  text not null default '',
  -- Decisão de 29/10: só a entrevista marcada e os lembretes saem; o resto liga na tela.
  emails_ligados       text[] not null default '{ENTREVISTA_AGENDADA,LEMBRETE_ENTREVISTA,LEMBRETE_ENTREVISTA_EQUIPE}',
  -- LGPD: currículo de quem não foi contratado fica até N meses após o último movimento.
  meses_guarda         smallint not null default 12 check (meses_guarda between 1 and 60)
);

-- ─── RLS: leitura por pode(); escrita só por função ────────────────────────
alter table polaris.rh_vagas               enable row level security;
alter table polaris.rh_candidatos          enable row level security;
alter table polaris.rh_candidaturas        enable row level security;
alter table polaris.rh_contatos_candidato  enable row level security;
alter table polaris.rh_eventos_candidatura enable row level security;
alter table polaris.rh_emails_candidato    enable row level security;
alter table polaris.rh_recrutamento_config enable row level security;

create policy rh_vagas_leitura on polaris.rh_vagas for select using (polaris.pode('recrutamento', 'ver'));
create policy rh_candidatos_leitura on polaris.rh_candidatos for select using (polaris.pode('recrutamento', 'ver'));
create policy rh_candidaturas_leitura on polaris.rh_candidaturas for select using (polaris.pode('recrutamento', 'ver'));
create policy rh_contatos_leitura on polaris.rh_contatos_candidato for select using (polaris.pode('recrutamento', 'ver'));
create policy rh_eventos_leitura on polaris.rh_eventos_candidatura for select using (polaris.pode('recrutamento', 'ver'));
create policy rh_emails_leitura on polaris.rh_emails_candidato for select using (polaris.pode('recrutamento', 'ver'));
create policy rh_config_leitura on polaris.rh_recrutamento_config for select using (polaris.pode('recrutamento', 'ver'));
-- Vaga e configuração podem ser editadas direto pela tela (sem efeito em cascata):
create policy rh_vagas_escrita on polaris.rh_vagas for all
  using (polaris.pode('recrutamento', 'editar')) with check (polaris.pode('recrutamento', 'editar'));
create policy rh_config_escrita on polaris.rh_recrutamento_config for update
  using (polaris.pode('recrutamento_config', 'editar'));

-- ─── Permissões (PROPOSTA — revisar com Nicolas e Leonardo) ────────────────
-- Os códigos de cargo abaixo são os tipos de login existentes no Polaris.
insert into polaris.permissoes (cargo, modulo, ver, criar, editar, excluir) values
  ('master',                 'recrutamento',         true,  true,  true,  true),
  ('master',                 'recrutamento_decidir', true,  true,  true,  true),
  ('master',                 'recrutamento_config',  true,  true,  true,  true),
  ('diretoria',              'recrutamento',         true,  false, false, false),
  ('diretoria',              'recrutamento_decidir', true,  true,  true,  false),
  ('gestor_rh',              'recrutamento',         true,  true,  true,  false),
  ('gestor_rh',              'recrutamento_decidir', true,  true,  true,  false), -- decisão de 29/10: todos do recrutamento decidem
  ('suporte_administrativo', 'recrutamento',         true,  true,  true,  false),
  ('suporte_administrativo', 'recrutamento_decidir', true,  true,  true,  false);

-- ─── Funções de passo (A FAZER) ────────────────────────────────────────────
-- Uma por passo, todas `security definer`, `set search_path = polaris`,
-- conferindo pode() e a etapa atual, gravando rh_eventos_candidatura e a fila
-- de e-mails na mesma transação. Espelham src/lib/recrutamento/processo.ts:
--
--   rh_rec_inscrever(dados jsonb, vaga_slug text)            -- landing page (anon) e cadastro manual
--   rh_rec_triagem(candidatura uuid, notas jsonb, decisao text, motivo text, comentario text)
--   rh_rec_contato(candidatura uuid, canal text, resultado text, observacao text, entrevista jsonb)
--   rh_rec_remarcar(candidatura uuid, entrevista jsonb, motivo text)
--   rh_rec_nao_compareceu(candidatura uuid, observacao text)
--   rh_rec_avaliacao(candidatura uuid, avaliacao jsonb)
--   rh_rec_decidir(candidatura uuid, resultado text, quem text, motivo text, comentario text)  -- pode('recrutamento_decidir','criar')
--   rh_rec_confirmar_inicio(candidatura uuid, data_inicio date)
--        → cria o pré-cadastro em rh_colaboradores e chama rh_abrir_processo('ADMISSAO'),
--          gravando o id em rh_candidaturas.rh_processo_id
--   rh_rec_desistir(candidatura uuid, motivo text)
--   rh_rec_desfazer(candidatura uuid)                          -- cancela negativa pendente
--   rh_rec_emails_vencidos() / rh_rec_marcar_email(id, situacao, motivo)  -- só chave de serviço, para a rota da fila
--
-- E acrescentar ao `pendencias_do_usuario` as contas do painel (triagem,
-- contato, decisão, confirmação, entrevista que passou sem registro) — a
-- bolinha do menu tem de ser cópia fiel da conta da tela.
