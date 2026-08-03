-- ============================================================
-- MIGRACAO 003 — devolucao da plaquinha
--
-- Rodar no SQL Editor, uma vez, depois da migracao 002.
--
-- MUDANCA DE PRODUTO:
-- "Entregue" e "plaquinha devolvida" sao coisas diferentes.
-- O garcom entrega o prato e a plaquinha continua na mesa do
-- cliente; ela so volta para a pilha depois.
--
-- O numero fica bloqueado enquanto a plaquinha estiver fora. Isso
-- protege contra o cliente que pega a plaquinha 9, le como 6 e
-- digita 6 — se a 6 estiver em uso, o totem recusa e manda conferir.
-- ============================================================


-- ------------------------------------------------------------
-- 1. QUANDO A PLAQUINHA VOLTOU PARA A PILHA
--
-- Nulo = ainda esta fora. E isso, e nao o status do pedido, que
-- decide se o numero pode ser digitado por outro cliente.
-- ------------------------------------------------------------
alter table pedidos add column if not exists plaquinha_devolvida_em timestamptz;

comment on column pedidos.plaquinha_devolvida_em is
  'Momento em que a plaquinha voltou para a pilha. Nulo = numero bloqueado. '
  'Marcado pelo garcom no KDS, separado da entrega do prato.';


-- ------------------------------------------------------------
-- 2. INDICE da checagem de numero em uso
--
-- Roda a cada pedido enviado. Cobre so as plaquinhas que estao
-- fora, que sao poucas.
-- ------------------------------------------------------------
drop index if exists idx_pedidos_numero_aberto;

create index if not exists idx_pedidos_plaquinha_fora
  on pedidos (estabelecimento_id, mesa_numero)
  where plaquinha_devolvida_em is null and status <> 'cancelado';


-- ------------------------------------------------------------
-- 3. PEDIDOS DE TESTE JA EXISTENTES
--
-- Marca como devolvidas as plaquinhas dos testes, senao esses
-- numeros ficam bloqueados o resto do dia.
-- ------------------------------------------------------------
update pedidos
   set plaquinha_devolvida_em = now(),
       status = 'entregue'
 where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88'
   and plaquinha_devolvida_em is null;


-- ------------------------------------------------------------
-- 4. CONFERE
-- ------------------------------------------------------------
select
  count(*) filter (where plaquinha_devolvida_em is null) as plaquinhas_fora,
  count(*) filter (where plaquinha_devolvida_em is not null) as plaquinhas_devolvidas,
  count(*) as total_pedidos
from pedidos
where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88';
