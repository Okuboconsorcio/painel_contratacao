-- Painel de contratação — de qual anúncio veio cada candidatura.
--
-- Pedido do Nicolas (04/11/2026), junto com o pixel "Okubo — Contratações" na
-- página de vagas: guardar utm_source, utm_medium, utm_campaign, utm_content e
-- fbclid de cada inscrição, para saber de qual anúncio veio cada candidato.
--
-- Um campo jsonb (não cinco colunas): é informação de leitura, sempre junta, e
-- o motor grava a candidatura inteira de uma vez.
--
-- Nulo de propósito: cadastro manual não tem anúncio, e a versão do app no ar
-- antes desta não manda o campo.
--
-- ORDEM: aplicar ANTES de publicar o painel que grava o campo. Depois de
-- aplicada, a versão antiga do app regrava a candidatura com `rastreio = null`
-- ao mexer nela (o `aplicar` substitui a linha inteira) — por isso painel novo
-- publicado logo em seguida.
--
-- Para desfazer: alter table recrutamento.candidatura drop column rastreio;

alter table recrutamento.candidatura add column rastreio jsonb;
notify pgrst, 'reload schema';
