-- ============================================================
-- CARDAPIO REAL — ADORAVEL BURGUER
--
-- Transcrito do cardapio impresso da loja em 15/08/2026.
--
-- PARCIAL DE PROPOSITO: so os hamburgueres. A foto nao mostrava
-- bebidas nem porcoes, e o resto entra depois.
--
-- Duas coisas do impresso NAO estao aqui, porque dependem das
-- bebidas para existir:
--   "+15,00 transforme seu burger em Combo"
--   (vira grupo de opcao reutilizavel, nao 15 produtos "Combo X":
--    o cardapio diz "SEU burger", entao e escolha, nao produto)
--
-- Duas correcoes conscientes em cima do impresso:
--   Romeu e Julieta — o impresso repete "bacon" duas vezes.
--     Erro de digitacao confirmado pelo Isaac, nao e bacon dobrado.
--   Tropical — o impresso esqueceu de citar o hamburguer.
--     Entra como blend angus 160g (padrao dos outros dessa faixa).
--
-- Este arquivo NAO apaga o cardapio de teste. Conferir o real na
-- tela primeiro; a limpeza esta no fim de seed_teste_dev.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATEGORIA
-- ------------------------------------------------------------
insert into categorias (id, estabelecimento_id, nome, ordem) values
  ('a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   '0d8ce944-a60e-469f-8dd5-622595fcab88', 'Hambúrgueres', 1);


-- ------------------------------------------------------------
-- 2. HAMBURGUERES
--
-- A ordem e a do cardapio impresso (do mais caro ao mais barato),
-- que foi como a loja escolheu apresentar. Mudar isso e decisao
-- do dono, nao detalhe tecnico: o que vem primeiro vende mais.
-- ------------------------------------------------------------
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Juan',
   'Brioche artesanal, 200g blend angus, queijo gouda, molho pesto, cebola salteada na manteiga, maionese dijon trufada, bacon steak.',
   59.00, 1),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Insano Burger',
   'Brioche artesanal, 2 blends angus 200g cada, cheddar, bacon steak, alface, tomate e maionese da casa.',
   53.00, 2),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Saint Brie',
   'Brioche artesanal, blend angus 160g, queijo brie, bacon com contraste sutil de geleia artesanal de damasco, maionese caseira.',
   43.00, 3),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Adorável Burger',
   'Brioche artesanal, blend angus de 160g, queijo bluecheese, bacon, molho de alho negro defumado com fundo levemente picante e cebola crispy.',
   42.00, 4),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Texas Burger',
   'Brioche artesanal, blend angus 160g, queijo american cheese, bacon, exclusivo molho barbecue Jack Daniel''s artesanal (0% álcool), cebola roxa, alface americana.',
   38.00, 5),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Australiano',
   'Pão australiano, blend angus 160g, cheddar, bacon, cebola caramelizada e maionese de alho defumada.',
   37.00, 6),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Bacon Cheese',
   'Brioche artesanal, blend angus 160g, cream cheese, bacon, maionese caseira ao molho chimichurri, cebola roxa e alface.',
   35.00, 7),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Divino',
   'Brioche artesanal, blend angus 160g, bacon, queijo coalho caramelizado no mel puro, maionese caseira e folhas de rúcula.',
   33.00, 8),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Tropical',
   'Brioche artesanal, blend angus 160g, abacaxi grelhado com fio de mel, queijo cheddar, folhas de rúcula, bacon, maionese caseira.',
   32.00, 9),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Romeu e Julieta',
   'Brioche artesanal, blend angus 160g, bacon, queijo minas, goiabada cremosa.',
   32.00, 10),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Americano',
   'Brioche artesanal, blend angus 160g, cheddar, bacon, picles, maionese caseira, cebola roxa, alface.',
   30.00, 11),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Mexicano 🌶',
   'Brioche artesanal, blend angus 160g, cheddar, bacon, maionese super picante, alface.',
   29.00, 12),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Clássico',
   'Brioche artesanal, blend angus 160g, cheddar, bacon, maionese caseira, alface, tomate.',
   28.00, 13),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Bigtella',
   'Brioche artesanal, blend angus 120g, cheddar, nutella original.',
   25.00, 14),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60',
   'Burger Kids',
   'Brioche artesanal, blend angus 120g, cheddar e maionese.',
   20.00, 15);


-- ------------------------------------------------------------
-- 3. BLEND GOURMET EXTRA (+R$ 9,50)
--
-- No impresso: "+9,50 acrescente um blend gourmet no seu burger".
-- E "no SEU burger" — vale para todos. Por isso e UM grupo ligado
-- aos 15, e nao um adicional repetido produto a produto: quando o
-- preco mudar, muda numa linha so.
--
-- max_selecao 1: o Insano ja vem com dois blends. Sem limite,
-- alguem monta um sanduiche de quatro carnes com dois toques e a
-- cozinha descobre isso no meio do movimento.
-- ------------------------------------------------------------
insert into grupos_opcoes (id, estabelecimento_id, nome, tipo, min_selecao, max_selecao) values
  ('b2f8e4d5-6c73-4a29-8b14-9d3f7e2c5a81',
   '0d8ce944-a60e-469f-8dd5-622595fcab88',
   'Turbine seu burger', 'adicional', 0, 1);

insert into opcoes (grupo_id, nome, preco_adicional, ordem) values
  ('b2f8e4d5-6c73-4a29-8b14-9d3f7e2c5a81', 'Blend gourmet extra', 9.50, 1);

-- liga o grupo a todos os hamburgueres de uma vez
insert into produto_grupos (produto_id, grupo_id, ordem)
select id, 'b2f8e4d5-6c73-4a29-8b14-9d3f7e2c5a81', 1
from produtos
where categoria_id = 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60';


-- ------------------------------------------------------------
-- CONFERENCIA — deve devolver 15 linhas, cada uma com o grupo
-- ------------------------------------------------------------
select p.ordem, p.nome, p.preco, count(pg.grupo_id) as grupos
from produtos p
left join produto_grupos pg on pg.produto_id = p.id
where p.categoria_id = 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60'
group by p.id, p.ordem, p.nome, p.preco
order by p.ordem;
