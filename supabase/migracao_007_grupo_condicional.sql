-- ============================================================
-- MIGRACAO 007 — Grupo de opcao condicional
--
-- Ate aqui, todo grupo ligado a um produto aparece SEMPRE na tela
-- (ver Produto.jsx). Isso nao serve para o combo: "Bebida do combo"
-- so deve aparecer depois que o cliente marcar "Transformar em
-- combo" — ninguem deve conseguir escolher a bebida do combo sem
-- pagar o combo.
--
-- depende_da_opcao_id NULO (como todo grupo ate hoje) = aparece
-- sempre, nada muda para "Turbine seu burger" nem para nenhum outro
-- grupo existente. PREENCHIDO = so aparece e so e exigido depois que
-- aquela opcao especifica for marcada em outro grupo do MESMO produto.
--
-- REGRA 2 nao e so front: a Edge Function criar-pedido tambem passa
-- a exigir a opcao-gatilho antes de aceitar qualquer escolha do
-- grupo dependente (senao dava pra pedir bebida de graca mandando so
-- o id da opcao, sem marcar o combo).
-- ============================================================

alter table grupos_opcoes
  add column depende_da_opcao_id uuid references opcoes(id) on delete set null;

comment on column grupos_opcoes.depende_da_opcao_id is
  'Nulo = grupo sempre visivel. Preenchido = so aparece/exige depois que essa opcao (de outro grupo do mesmo produto) for escolhida.';
