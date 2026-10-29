-- Painel de contratação — funções do banco.
--
-- As regras do processo (etapas, prazos, e-mails, LGPD) vivem no motor do app
-- (`src/lib/recrutamento/processo.ts`), que roda no servidor. Cada passo lê o
-- banco, aplica a regra em memória e devolve o que mudou; `aplicar` grava tudo
-- de uma vez, numa transação só: ou entra o passo inteiro, ou nada.
--
-- Só a chave secreta (servidor) executa estas funções.

create or replace function recrutamento.aplicar(p jsonb)
returns void
language plpgsql
security definer
set search_path = recrutamento, pg_temp
as $$
declare
  t text;
  sets text;
begin
  -- Apaga dos filhos para os pais (só a limpeza LGPD apaga).
  foreach t in array array['email', 'evento', 'contato', 'candidatura', 'candidato', 'vaga'] loop
    if jsonb_array_length(coalesce(p -> t -> 'apagar', '[]')) > 0 then
      execute format('delete from recrutamento.%I where id = any($1)', t)
        using array(select jsonb_array_elements_text(p -> t -> 'apagar'));
    end if;
  end loop;

  -- Grava dos pais para os filhos: linha nova entra, linha que existe é substituída.
  foreach t in array array['vaga', 'candidato', 'candidatura', 'contato', 'evento', 'email'] loop
    if jsonb_array_length(coalesce(p -> t -> 'gravar', '[]')) > 0 then
      select string_agg(format('%I = excluded.%I', column_name, column_name), ', ')
        into sets
        from information_schema.columns
       where table_schema = 'recrutamento' and table_name = t and column_name <> 'id';
      execute format(
        'insert into recrutamento.%1$I select * from jsonb_populate_recordset(null::recrutamento.%1$I, $1) '
        'on conflict (id) do update set %2$s', t, sets)
        using p -> t -> 'gravar';
    end if;
  end loop;

  if p ? 'config' then
    update recrutamento.config set dados = p -> 'config' where id;
  end if;

  if jsonb_array_length(coalesce(p -> 'limpezas_lgpd', '[]')) > 0 then
    insert into recrutamento.limpeza_lgpd (em, candidatos)
    select (x ->> 'em')::timestamptz, (x ->> 'candidatos')::integer
      from jsonb_array_elements(p -> 'limpezas_lgpd') x;
  end if;
end $$;

-- Reserva os e-mails que já passaram da hora, para um envio só: duas telas
-- abertas ao mesmo tempo não mandam o mesmo e-mail duas vezes. Quem reservou
-- envia e grava o resultado; reserva esquecida (queda no meio) volta para a
-- fila depois de 10 minutos.
create or replace function recrutamento.reservar_emails()
returns setof recrutamento.email
language plpgsql
security definer
set search_path = recrutamento, pg_temp
as $$
begin
  update recrutamento.email
     set situacao = 'PENDENTE'
   where situacao = 'ENVIANDO' and enviado_em < now() - interval '10 minutes';

  return query
  update recrutamento.email
     set situacao = 'ENVIANDO', enviado_em = now()
   where id in (
     select id from recrutamento.email
      where situacao = 'PENDENTE' and agendado_para <= now()
      order by agendado_para
      for update skip locked
   )
  returning *;
end $$;

-- Grava o resultado de um envio. Só mexe em quem ainda está reservado: se o
-- e-mail foi cancelado no meio (desfez a reprovação), o cancelamento vale.
create or replace function recrutamento.registrar_envio(p_id text, p_enviado boolean, p_motivo text)
returns void
language sql
security definer
set search_path = recrutamento, pg_temp
as $$
  update recrutamento.email
     set situacao = case when p_enviado then 'ENVIADO' else 'FALHOU' end,
         enviado_em = case when p_enviado then now() else null end,
         motivo = coalesce(p_motivo, '')
   where id = p_id and situacao = 'ENVIANDO';
$$;

revoke all on function recrutamento.aplicar(jsonb) from public, anon, authenticated;
revoke all on function recrutamento.reservar_emails() from public, anon, authenticated;
revoke all on function recrutamento.registrar_envio(text, boolean, text) from public, anon, authenticated;
grant execute on function recrutamento.aplicar(jsonb) to service_role;
grant execute on function recrutamento.reservar_emails() to service_role;
grant execute on function recrutamento.registrar_envio(text, boolean, text) to service_role;
