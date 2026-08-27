-- ============================================================
-- CORRECAO — Pequena e Adorável Batata
--
-- A foto do cardapio (27/08/2026) estava de cabeca para baixo. Duas
-- leituras saíram erradas em cardapio_adoravelburguer_porcoes_milkshake.sql,
-- ja rodado no banco:
--   1. "Pequena" foi cadastrada com 200g; o certo e 120g.
--   2. "Adorável Batata" entrou sem descricao; tem "Nutella e leite
--      ninho", que so apareceu depois de girar a foto certo.
--
-- Rodar uma vez so. Depois disso o arquivo original ja fica com o
-- texto certo para quem ler no futuro.
-- ============================================================

update produtos
   set descricao = 'Aprox. 120g.'
 where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88'
   and categoria_id = '8173df9c-25e5-48f0-834a-48e4bd2ab47e'
   and nome = 'Pequena';

update produtos
   set descricao = 'Nutella e leite ninho.'
 where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88'
   and categoria_id = '8173df9c-25e5-48f0-834a-48e4bd2ab47e'
   and nome = 'Adorável Batata';


-- ------------------------------------------------------------
-- CONFERENCIA — deve devolver as duas linhas com a descricao certa
-- ------------------------------------------------------------
select nome, descricao, preco
from produtos
where categoria_id = '8173df9c-25e5-48f0-834a-48e4bd2ab47e'
order by ordem;
