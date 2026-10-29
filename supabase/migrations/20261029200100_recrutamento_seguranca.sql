-- Painel de contratação — quem lê e quem grava.
--
-- Desenho: o navegador NUNCA fala direto com estas tabelas. Quem lê e grava é
-- o servidor do painel (Vercel), com a chave secreta, DEPOIS de conferir o
-- login e o papel da pessoa (`src/lib/recrutamento/sessao.ts` + `permissoes.ts`).
-- Por isso a RLS fica ligada em tudo e o usuário logado só enxerga a própria
-- linha em `usuario` (é o que o login precisa para saber o papel).
--
-- Para desfazer: `drop schema recrutamento cascade;` +
-- `delete from storage.objects where bucket_id = 'recrutamento';` +
-- `delete from storage.buckets where id = 'recrutamento';`

alter table recrutamento.usuario      enable row level security;
alter table recrutamento.vaga         enable row level security;
alter table recrutamento.candidato    enable row level security;
alter table recrutamento.candidatura  enable row level security;
alter table recrutamento.contato      enable row level security;
alter table recrutamento.evento       enable row level security;
alter table recrutamento.email        enable row level security;
alter table recrutamento.config       enable row level security;
alter table recrutamento.limpeza_lgpd enable row level security;

create policy usuario_ve_a_si on recrutamento.usuario
  for select to authenticated using (id = auth.uid() and ativo);

revoke all on all tables in schema recrutamento from anon, authenticated;
grant usage on schema recrutamento to authenticated, service_role;
grant select on recrutamento.usuario to authenticated;
grant all on all tables in schema recrutamento to service_role;
grant usage, select on all sequences in schema recrutamento to service_role;

-- Currículos e fichas escaneadas: bucket privado, só o servidor acessa
-- (sem política para usuário logado; a chave secreta não depende delas).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recrutamento', 'recrutamento', false, 10485760,
  array['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png']
);
