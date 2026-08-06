-- ============================================================
-- MIGRACAO 004 — cardapio se atualiza ao vivo no totem
--
-- Rodar no SQL Editor, uma vez, depois da migracao 003.
--
-- POR QUE:
-- Hoje o totem busca o cardapio quando o cliente toca em "Toque
-- para pedir". Quem ja esta pedindo nao ve o item esgotar, e leva a
-- recusa so no fim, na hora de confirmar a mesa.
--
-- Com produtos na publicacao de tempo real, o banco avisa o totem na
-- hora em que o dono toca em "Esgotado", e o item apaga na tela
-- mesmo com o cliente olhando.
--
-- NAO substitui a validacao no servidor: o pedido ainda pode ser
-- recusado se o item esgotar no mesmo segundo do envio. Tempo real
-- reduz a frequencia; quem decide continua sendo o banco.
-- ============================================================

alter publication supabase_realtime add table produtos;


-- ------------------------------------------------------------
-- Nota sobre privacidade:
--
-- A policy 'prod_publico' ja permite que qualquer visitante LEIA o
-- cardapio de qualquer loja — decisao consciente, cardapio nao e
-- sigiloso. O tempo real herda essa mesma permissao, entao um
-- assinante poderia ouvir mudanca de produto de outra loja.
--
-- Nada novo e exposto por esta migracao. Ainda assim o totem assina
-- filtrando por estabelecimento_id, para nao reagir a mudanca de
-- loja alheia.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- CONFERE: produtos deve aparecer na lista
-- ------------------------------------------------------------
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
