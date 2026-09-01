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
-- ============================================================

-- ----------------------------------------------------------
-- 1. Colunas novas em pedidos
-- ----------------------------------------------------------
alter table pedidos add column if not exists pago_em timestamptz;
alter table pedidos add column if not exists pix_pagamento_id text;

comment on column pedidos.pago_em is 'Instante da confirmacao de pagamento (webhook do Mercado Pago).';
comment on column pedidos.pix_pagamento_id is 'Id do pagamento no Mercado Pago — liga o webhook ao pedido, evita processar a mesma confirmacao duas vezes.';

create index if not exists idx_pedidos_pix_pagamento_id
  on pedidos (pix_pagamento_id) where pix_pagamento_id is not null;

-- ----------------------------------------------------------
-- CONFERE
-- ----------------------------------------------------------
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'pedidos' and column_name in ('pago_em', 'pix_pagamento_id');
