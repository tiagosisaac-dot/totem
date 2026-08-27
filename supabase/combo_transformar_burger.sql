-- ============================================================
-- COMBO — "+R$15,00 transforme seu burger em Combo!"
--
-- Precisa da migracao_007_grupo_condicional.sql rodada ANTES deste
-- arquivo (cria a coluna depende_da_opcao_id usada abaixo).
--
-- Dois grupos, ligados aos mesmos 15 hamburgueres de
-- cardapio_adoravelburguer.sql:
--
--   "Transformar em combo" — adicional, 1 opcao, +R$15,00.
--     Acompanha batata frita pequena (fica so como texto: nao vira
--     linha separada do pedido, ver aviso no chat).
--
--   "Bebida do combo" — escolha obrigatoria, MAS depende_da_opcao_id
--     aponta para a opcao acima: so aparece e so e exigida depois
--     que o cliente marcar o combo.
--
--     Agua e refrigerante nao somam nada (o combo fica em R$15).
--     Suco Del Valle soma +R$2,00 (combo vira R$17).
--     Heineken Long Neck soma +R$5,00 (combo vira R$20).
--
-- Este arquivo nao apaga nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. GRUPO "TRANSFORMAR EM COMBO"
-- ------------------------------------------------------------
insert into grupos_opcoes (id, estabelecimento_id, nome, tipo, min_selecao, max_selecao) values
  ('1a22e1e1-e268-45a6-b4d0-98bbf79ae785',
   '0d8ce944-a60e-469f-8dd5-622595fcab88',
   'Transformar em combo', 'adicional', 0, 1);

insert into opcoes (id, grupo_id, nome, preco_adicional, ordem) values
  ('4599c16f-85cc-40aa-b178-25a3a3af5bf6',
   '1a22e1e1-e268-45a6-b4d0-98bbf79ae785',
   'Sim, virar combo (acompanha batata frita pequena e bebida)', 15.00, 1);


-- ------------------------------------------------------------
-- 2. GRUPO "BEBIDA DO COMBO" — condicional
--
-- min_selecao 1: uma vez que o combo foi marcado, a bebida passa a
-- ser obrigatoria (nao da pra pagar o combo e nao levar bebida).
-- ------------------------------------------------------------
insert into grupos_opcoes (id, estabelecimento_id, nome, tipo, min_selecao, max_selecao, depende_da_opcao_id) values
  ('08323d05-88a7-4422-8e76-41f3c86695c9',
   '0d8ce944-a60e-469f-8dd5-622595fcab88',
   'Bebida do combo', 'escolha', 1, 1,
   '4599c16f-85cc-40aa-b178-25a3a3af5bf6');

insert into opcoes (grupo_id, nome, preco_adicional, ordem) values
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Coca-Cola Normal',        0.00, 1),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Coca-Cola Zero',          0.00, 2),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Fanta Laranja',           0.00, 3),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Fanta Uva',               0.00, 4),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Schweppes Normal',        0.00, 5),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Schweppes Zero',          0.00, 6),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Sprite Normal',           0.00, 7),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Sprite Zero',             0.00, 8),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Água com Gás',            0.00, 9),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Água sem Gás',            0.00, 10),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Suco Del Valle Uva',      2.00, 11),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Suco Del Valle Maracujá', 2.00, 12),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Suco Del Valle Pêssego',  2.00, 13),
  ('08323d05-88a7-4422-8e76-41f3c86695c9', 'Heineken Long Neck',      5.00, 14);


-- ------------------------------------------------------------
-- 3. LIGA OS DOIS GRUPOS AOS 15 HAMBURGUERES
--
-- ordem 2 e 3: ficam depois de "Turbine seu burger" (ordem 1) na
-- tela do produto.
-- ------------------------------------------------------------
insert into produto_grupos (produto_id, grupo_id, ordem)
select id, '1a22e1e1-e268-45a6-b4d0-98bbf79ae785', 2
from produtos
where categoria_id = 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60';

insert into produto_grupos (produto_id, grupo_id, ordem)
select id, '08323d05-88a7-4422-8e76-41f3c86695c9', 3
from produtos
where categoria_id = 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60';


-- ------------------------------------------------------------
-- CONFERENCIA — deve devolver 15 linhas, cada uma com 3 grupos
-- (Turbine seu burger, Transformar em combo, Bebida do combo)
-- ------------------------------------------------------------
select p.nome, count(pg.grupo_id) as grupos
from produtos p
join produto_grupos pg on pg.produto_id = p.id
where p.categoria_id = 'a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60'
group by p.id, p.nome
order by p.nome;
