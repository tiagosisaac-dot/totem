-- ============================================================
-- ADICIONA HEINEKEN — bebida que entrou depois do cadastro inicial
--
-- O arquivo cardapio_adoravelburguer_bebidas.sql ja tinha sido
-- rodado (13 bebidas) quando a Heineken foi lembrada. Este arquivo
-- so acrescenta ela, sem duplicar as outras 13.
-- ============================================================

insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '25a85136-1443-44d0-a453-f19927ceab6c',
   'Heineken Long Neck', null, 12.00, 14);


-- ------------------------------------------------------------
-- CONFERENCIA — deve devolver 1 linha: 14 produtos, R$5 a R$12
-- ------------------------------------------------------------
select count(*) as produtos, min(preco) as menor_preco, max(preco) as maior_preco
from produtos
where categoria_id = '25a85136-1443-44d0-a453-f19927ceab6c';
