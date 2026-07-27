-- ============================================================
-- DADOS DE TESTE — AMBIENTE DEV APENAS
--
-- NAO RODAR EM PRODUCAO.
--
-- Cria 40 mesas (essas ficam) e um cardapio FALSO para validar
-- a Edge Function criar-pedido (esse e descartavel).
--
-- Todo registro de cardapio de teste usa id que comeca com
-- 00000000-0000-4000-8000-  para poder apagar tudo de uma vez.
-- O comando de limpeza esta no fim do arquivo.
-- ============================================================

-- Adoravel Burguer: 0d8ce944-a60e-469f-8dd5-622595fcab88
-- (esse id so aparece aqui; a aplicacao sempre busca pelo slug)


-- ------------------------------------------------------------
-- 1. MESAS 1 a 40 (dados reais, ficam)
-- ------------------------------------------------------------
insert into mesas (estabelecimento_id, numero)
select '0d8ce944-a60e-469f-8dd5-622595fcab88', n
from generate_series(1, 40) as n
on conflict (estabelecimento_id, numero) do nothing;


-- ------------------------------------------------------------
-- 2. CATEGORIAS DE TESTE
-- ------------------------------------------------------------
insert into categorias (id, estabelecimento_id, nome, ordem) values
  ('00000000-0000-4000-8000-000000000001', '0d8ce944-a60e-469f-8dd5-622595fcab88', 'Hambúrgueres (teste)', 1),
  ('00000000-0000-4000-8000-000000000002', '0d8ce944-a60e-469f-8dd5-622595fcab88', 'Bebidas (teste)',      2),
  ('00000000-0000-4000-8000-000000000003', '0d8ce944-a60e-469f-8dd5-622595fcab88', 'Combos (teste)',       3);


-- ------------------------------------------------------------
-- 3. PRODUTOS DE TESTE
-- ------------------------------------------------------------
insert into produtos (id, estabelecimento_id, categoria_id, nome, descricao, preco, tipo, ordem) values
  ('00000000-0000-4000-8000-000000000011', '0d8ce944-a60e-469f-8dd5-622595fcab88',
   '00000000-0000-4000-8000-000000000001', 'Hambúrguer Teste', 'Pão, carne e queijo', 20.00, 'simples', 1),

  ('00000000-0000-4000-8000-000000000012', '0d8ce944-a60e-469f-8dd5-622595fcab88',
   '00000000-0000-4000-8000-000000000002', 'Refrigerante Teste', 'Lata 350ml', 6.00, 'simples', 1),

  ('00000000-0000-4000-8000-000000000013', '0d8ce944-a60e-469f-8dd5-622595fcab88',
   '00000000-0000-4000-8000-000000000003', 'Combo Teste', 'Hambúrguer + bebida', 25.00, 'combo', 1);


-- ------------------------------------------------------------
-- 4. GRUPOS DE OPCOES DE TESTE
--    'adicional' soma preco / 'escolha' e obrigatoria
-- ------------------------------------------------------------
insert into grupos_opcoes (id, estabelecimento_id, nome, tipo, min_selecao, max_selecao) values
  ('00000000-0000-4000-8000-000000000021', '0d8ce944-a60e-469f-8dd5-622595fcab88',
   'Adicionais (teste)', 'adicional', 0, 3),

  ('00000000-0000-4000-8000-000000000022', '0d8ce944-a60e-469f-8dd5-622595fcab88',
   'Ponto da carne (teste)', 'escolha', 1, 1);

insert into opcoes (id, grupo_id, nome, preco_adicional, ordem) values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000021', 'Bacon',        4.00, 1),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000021', 'Queijo extra', 3.00, 2),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000022', 'Ao ponto',     0.00, 1),
  ('00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000022', 'Bem passada',  0.00, 2);

-- os dois grupos valem para o Hamburguer Teste
insert into produto_grupos (produto_id, grupo_id, ordem) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000022', 1),  -- obrigatorio primeiro
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', 2);


-- ------------------------------------------------------------
-- 5. COMBO DE TESTE
--    combo = produto que contem produtos (mecanismo diferente
--    de adicional, nao confundir)
-- ------------------------------------------------------------
insert into combo_slots (id, combo_id, nome, min_selecao, max_selecao, ordem) values
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000013',
   'Escolha o sanduíche', 1, 1, 1),
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000013',
   'Escolha a bebida', 1, 1, 2);

insert into combo_slot_produtos (slot_id, produto_id, preco_adicional) values
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000011', 0.00),
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000012', 0.00);


-- ------------------------------------------------------------
-- 6. CONFERE O QUE FOI CRIADO
-- ------------------------------------------------------------
select
  (select count(*) from mesas     where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88') as mesas,
  (select count(*) from categorias where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88') as categorias,
  (select count(*) from produtos   where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88') as produtos,
  (select count(*) from opcoes     where grupo_id::text like '00000000-0000-4000-8000-%')             as opcoes;


-- ============================================================
-- LIMPEZA (rodar quando o cardapio real entrar)
--
-- delete from produtos      where id::text like '00000000-0000-4000-8000-%';
-- delete from grupos_opcoes where id::text like '00000000-0000-4000-8000-%';
-- delete from categorias    where id::text like '00000000-0000-4000-8000-%';
--
-- (opcoes, produto_grupos, combo_slots e combo_slot_produtos
--  desaparecem sozinhos por causa do "on delete cascade")
-- ============================================================
