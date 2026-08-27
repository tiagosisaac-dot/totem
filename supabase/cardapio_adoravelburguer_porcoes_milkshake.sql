-- ============================================================
-- CARDAPIO REAL — ADORAVEL BURGUER — BATATA FRITA E MILKSHAKE
--
-- Transcrito da foto do cardapio impresso mandada pelo Isaac em
-- 27/08/2026 ("Foto cardápio completa.jpg"). Precos conferidos com
-- ele antes de escrever este arquivo.
--
-- AINDA FALTA: bebidas (outra pagina do impresso, a caminho) e o
-- combo "+R$15,00 transforme seu burger em Combo!", que so pode
-- ser montado depois que a bebida existir (ver cardapio_adoravelburguer.sql).
--
-- Milkshake virou 5 PRODUTOS separados, um por sabor — nao um grupo
-- de opcao com preco variavel. Motivo: e o mesmo padrao ja usado nos
-- 15 hamburgueres e nas 5 batatas (cada item do impresso = uma linha
-- em produtos); grupo de opcao no sistema so soma preco em cima de
-- um produto (Turbine seu burger), nunca troca o preco base. Usar
-- grupo aqui exigiria um jeito de precificar que nunca foi testado,
-- e o card do cardapio so mostra UM preco por produto — com sabor
-- variavel, o card mostraria R$22 mas o Oreo custa R$27, e o cliente
-- só descobriria a diferenca depois de abrir o produto.
--
-- A foto original estava de cabeça para baixo, o que causou duas
-- leituras erradas na primeira versao deste arquivo (ja corrigidas
-- aqui, e no banco via correcao_batata_frita_28082026.sql):
--   Pequena era 120g, nao 200g.
--   Adorável Batata tinha descricao ("Nutella e leite ninho") que
--   ficou de fora por nao ter sido vista na foto invertida.
--
-- Este arquivo nao apaga nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATEGORIAS
-- ------------------------------------------------------------
insert into categorias (id, estabelecimento_id, nome, ordem) values
  ('8173df9c-25e5-48f0-834a-48e4bd2ab47e',
   '0d8ce944-a60e-469f-8dd5-622595fcab88', 'Batata Frita', 2),
  ('d3d28c8b-c04a-4bae-a5f1-3a91975bb788',
   '0d8ce944-a60e-469f-8dd5-622595fcab88', 'Milkshake', 3);


-- ------------------------------------------------------------
-- 2. BATATA FRITA
-- ------------------------------------------------------------
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '8173df9c-25e5-48f0-834a-48e4bd2ab47e',
   'Pequena', 'Aprox. 120g.', 11.00, 1),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '8173df9c-25e5-48f0-834a-48e4bd2ab47e',
   'Grande', 'Aprox. 300g.', 21.00, 2),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '8173df9c-25e5-48f0-834a-48e4bd2ab47e',
   'Cheddar e Bacon', null, 28.00, 3),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '8173df9c-25e5-48f0-834a-48e4bd2ab47e',
   'Adorável Batata', 'Nutella e leite ninho.', 30.00, 4),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', '8173df9c-25e5-48f0-834a-48e4bd2ab47e',
   'Batata Supreme',
   'Cremecheese, cupim desfiado na cerveja preta, queijo parmesão.',
   49.00, 5);


-- ------------------------------------------------------------
-- 3. MILKSHAKE (500ml)
-- ------------------------------------------------------------
insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, ordem) values
  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'd3d28c8b-c04a-4bae-a5f1-3a91975bb788',
   'Milkshake Chocolate', '500ml.', 22.00, 1),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'd3d28c8b-c04a-4bae-a5f1-3a91975bb788',
   'Milkshake Morango', '500ml.', 22.00, 2),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'd3d28c8b-c04a-4bae-a5f1-3a91975bb788',
   'Milkshake Ovomaltine', '500ml.', 23.00, 3),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'd3d28c8b-c04a-4bae-a5f1-3a91975bb788',
   'Milkshake Paçoca', '500ml.', 24.00, 4),

  ('0d8ce944-a60e-469f-8dd5-622595fcab88', 'd3d28c8b-c04a-4bae-a5f1-3a91975bb788',
   'Milkshake Oreo', '500ml.', 27.00, 5);


-- ------------------------------------------------------------
-- CONFERENCIA — deve devolver 2 categorias com 5 produtos cada
-- ------------------------------------------------------------
select c.nome as categoria, count(p.id) as produtos, min(p.preco) as menor_preco, max(p.preco) as maior_preco
from categorias c
join produtos p on p.categoria_id = c.id
where c.id in ('8173df9c-25e5-48f0-834a-48e4bd2ab47e', 'd3d28c8b-c04a-4bae-a5f1-3a91975bb788')
group by c.nome
order by c.nome;
