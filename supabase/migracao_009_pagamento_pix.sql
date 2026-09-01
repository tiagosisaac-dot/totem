-- ============================================================
-- MIGRACAO 009 — pagamento por Pix
--
-- MUDANCA DE PRODUTO: o totem deixa de aceitar "pagar no caixa" — todo
-- pedido e pago ali mesmo, por QR code Pix dinamico, com confirmacao
-- automatica via webhook do Mercado Pago (nunca por botao de "eu paguei").
-- A impressao na cozinha volta a ser automatica, mas agora presa ao
-- pagamento confirmado: so imprime sozinho depois que pago=true.
--
-- pedidos.pago, pedidos.forma_pagamento e pedidos.status ja existiam no
-- schema original (schema_totem_v1.sql), sem uso ate agora. So faltam as
-- duas colunas abaixo.
--
-- NOTA: o nome real da coluna e pagamento_externo_id (nao pix_pagamento_id
-- — uma versao anterior deste arquivo, ja rodada, usou esse nome; o codigo
-- foi ajustado pra usar o nome que ja esta no banco, em vez de renomear a
-- coluna de novo).
-- ============================================================

-- ----------------------------------------------------------
-- 1. Colunas novas em pedidos (idempotente — seguro rodar de novo)
-- ----------------------------------------------------------
alter table pedidos add column if not exists pago_em timestamptz;
alter table pedidos add column if not exists pagamento_externo_id text;

comment on column pedidos.pago_em is 'Instante da confirmacao de pagamento (webhook do Mercado Pago).';
comment on column pedidos.pagamento_externo_id is 'Id do pagamento no Mercado Pago — liga o webhook ao pedido, evita processar a mesma confirmacao duas vezes.';

create index if not exists idx_pedidos_pagamento_externo_id
  on pedidos (pagamento_externo_id) where pagamento_externo_id is not null;

-- ----------------------------------------------------------
-- CONFERE
-- ----------------------------------------------------------
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'pedidos' and column_name in ('pago_em', 'pagamento_externo_id');
