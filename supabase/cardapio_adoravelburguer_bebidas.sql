-- ============================================================
-- CARDAPIO REAL — ADORAVEL BURGUER — BEBIDAS
--
-- Ditado pelo Isaac em 28/08/2026 (nao veio de foto desta vez).
--
-- 14 produtos separados, mesmo padrao das batatas e do milkshake:
-- cada linha do cardapio impresso vira um produto proprio, mesmo
-- quando o preco se repete dentro do grupo (todo refrigerante e
-- R$7, custasse o que custasse o sabor).
--
-- Este arquivo nao apaga nada. O combo ("+R$15,00 transforme seu
-- burger") entra depois, num arquivo separado — depende de mudanca
-- de codigo, nao so de dado.
-- ============================================================

insert into categorias (id, estabelecimento_id, nome, ordem) values
  ('25a85136-1443-44d0-a453-f19927ceab6c',
   '0d8ce944-a60e-469f-8dd5-622595fcab88', 'Bebidas', 4);


-- ------------------------------------------------------------
-- REFRIGERANTES (310ml) — R$ 7,00 cada
-- ------------------------------------------------------------
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Coca-Cola Normal', '310ml.', 7.00, 1),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Coca-Cola Zero', '310ml.', 7.00, 2),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Fanta Laranja', '310ml.', 7.00, 3),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Fanta Uva', '310ml.', 7.00, 4),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Schweppes Normal', '310ml.', 7.00, 5),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Schweppes Zero', '310ml.', 7.00, 6),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Sprite Normal', '310ml.', 7.00, 7),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Sprite Zero', '310ml.', 7.00, 8);


-- ------------------------------------------------------------
-- AGUA
-- ------------------------------------------------------------
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Água com Gás', null, 6.00, 9),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Água sem Gás', null, 5.00, 10);


-- ------------------------------------------------------------
-- SUCOS DEL VALLE (290ml) — R$ 8,00 cada
-- ------------------------------------------------------------
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Suco Del Valle Uva', '290ml.', 8.00, 11),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Suco Del Valle Maracujá', '290ml.', 8.00, 12),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Suco Del Valle Pêssego', '290ml.', 8.00, 13);


-- ------------------------------------------------------------
-- CERVEJA
-- ------------------------------------------------------------
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Heineken Long Neck', null, 12.00, 14);


-- ------------------------------------------------------------
-- CONFERENCIA — deve devolver 1 linha: 14 produtos, R$5 a R$12
-- ------------------------------------------------------------
select count(*) as produtos, min(preco) as menor_preco, max(preco) as maior_preco
from produtos
where categoria_id = '25a85136-1443-44d0-a453-f19927ceab6c';
