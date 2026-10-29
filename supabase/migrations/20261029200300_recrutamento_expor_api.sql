-- Painel de contratação — deixa a API do Supabase enxergar o schema.
--
-- Vale para o projeto inteiro: por isso a lista é a que já existia (conferida
-- em 29/10/2026) com `recrutamento` acrescentado no fim. Conferir de novo
-- antes de aplicar — se mudou, acrescentar ao valor novo, nunca sobrescrever:
--   select unnest(rolconfig) from pg_roles where rolname = 'authenticator';
--
-- Para desfazer: o mesmo comando sem `recrutamento` e o `notify` de novo.

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, polaris, leads_nick, fila_agil, recrutamento';
notify pgrst, 'reload config';
