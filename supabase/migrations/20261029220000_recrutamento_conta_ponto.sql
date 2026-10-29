-- Painel de contratação — campo "Conta ponto" (diferenciais) na vaga.
--
-- Pedido do Nicolas (29/10/2026): a página de vagas mostra, como no anúncio,
-- "O que oferecemos", "Requisitos" e "Conta ponto" (o que ajuda mas não é exigido).
--
-- Sem NOT NULL de propósito: a versão do app que está no ar antes desta não manda
-- o campo, e `aplicar` (jsonb_populate_recordset) gravaria NULL — com NOT NULL, editar
-- uma vaga quebraria até a versão nova ser publicada. O app trata NULL como vazio.
--
-- Para desfazer: alter table recrutamento.vaga drop column diferenciais;

alter table recrutamento.vaga add column diferenciais text default '';
notify pgrst, 'reload schema';
