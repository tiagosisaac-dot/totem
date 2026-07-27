-- ============================================================
-- MIGRACAO 002 — o numero vem da plaquinha, nao do sistema
--
-- Rodar no SQL Editor, uma vez, depois do schema_totem_v1.sql.
--
-- MUDANCA DE PRODUTO:
-- O cliente pega uma plaquinha numerada ao lado do totem, deixa ela
-- na mesa e digita esse numero no fim do pedido. O sistema nao gera
-- mais numero sequencial. As plaquinhas voltam para a pilha em
-- qualquer ordem — o dono nao precisa reorganizar nada no fim do dia.
-- ============================================================


-- ------------------------------------------------------------
-- 1. 'senha' deixa de ser obrigatoria
--
-- O numero do pedido agora vem digitado pelo cliente e fica em
-- mesa_numero. A coluna senha e a funcao proxima_senha continuam
-- existindo, sem uso: servem se algum cliente futuro preferir
-- senha sequencial gerada pelo sistema, sem plaquinha.
-- ------------------------------------------------------------
alter table pedidos alter column senha drop not null;

comment on column pedidos.senha is
  'SEM USO no modelo de plaquinha. Reservada para senha sequencial gerada pelo sistema.';

comment on column pedidos.mesa_numero is
  'Numero da plaquinha que o cliente pegou e digitou. E a identificacao do pedido.';

comment on table mesas is
  'Numeros validos que o cliente pode digitar (as plaquinhas fisicas). '
  'Serve para barrar erro de digitacao, tipo mesa 99 numa loja com 40 plaquinhas.';


-- ------------------------------------------------------------
-- 2. AVISO DE NUMERO REUTILIZADO
--
-- Quando um cliente tenta usar um numero que ainda esta em pedido
-- aberto, o pedido novo e recusado ("pegue outra plaquinha") e o
-- pedido antigo recebe esta marca. O KDS destaca ele para a equipe
-- lembrar de marcar como entregue.
--
-- Como o realtime ja esta ligado em pedidos, o aviso aparece na
-- cozinha na hora, sem precisar recarregar a tela.
-- ------------------------------------------------------------
alter table pedidos add column if not exists alerta_reuso_em timestamptz;

comment on column pedidos.alerta_reuso_em is
  'Momento em que outro cliente tentou usar este numero. KDS destaca para conferir entrega.';


-- ------------------------------------------------------------
-- 3. INDICE para a checagem de numero em aberto
--
-- Essa consulta roda a cada pedido enviado. O indice parcial cobre
-- so os pedidos que ainda nao terminaram, que sao poucos.
-- ------------------------------------------------------------
create index if not exists idx_pedidos_numero_aberto
  on pedidos (estabelecimento_id, mesa_numero)
  where status in ('aguardando_pagamento', 'em_producao', 'pronto');


-- ------------------------------------------------------------
-- 4. CONFERE
-- ------------------------------------------------------------
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'pedidos'
  and column_name in ('senha', 'mesa_numero', 'alerta_reuso_em')
order by column_name;
