-- ============================================================
-- MIGRACAO 008 — Fim da mesa/plaquinha: nome do cliente + senha +
-- impressao do pedido
--
-- MUDANCA DE PRODUTO (Adoravel Burguer):
-- Sem tela de cozinha/balcao e sem plaquinha fisica, ninguem mais
-- olha numero de mesa. O cliente digita o proprio nome e escolhe
-- comer no local ou levar; o pedido sai IMPRESSO direto na cozinha
-- (Bematech i9), do jeito que ja fazem hoje com o Anota Ai.
--
-- A 'senha' (sequencial do dia, funcao proxima_senha) volta a ser
-- usada — nao para telao nem chamada em voz alta, so contador
-- interno pro Isaac conferir quantos pedidos saíram pelo totem no
-- fim do dia.
--
-- mesa_numero, alerta_reuso_em e plaquinha_devolvida_em ficam na
-- tabela (tem pedido real com esses dados, apagar coluna e mais
-- risco que apagar indice) mas nenhum codigo novo le ou escreve
-- neles a partir de agora.
-- ============================================================

alter table pedidos add column if not exists nome_cliente text not null default '';
alter table pedidos alter column nome_cliente drop default;

alter table pedidos add column if not exists tipo_consumo text not null default 'local'
  check (tipo_consumo in ('local', 'levar'));

alter table pedidos add column if not exists impresso_em timestamptz;

comment on column pedidos.nome_cliente is
  'Nome digitado pelo cliente no totem. Identifica o pedido na cozinha e no caixa — sem mesa.';
comment on column pedidos.tipo_consumo is
  '''local'' ou ''levar'', escolhido pelo cliente na ultima tela do totem.';
comment on column pedidos.impresso_em is
  'Momento em que o cupom saiu na impressora da cozinha. Nulo = ainda falta imprimir.';
comment on column pedidos.senha is
  'Sequencial do dia (proxima_senha). So contagem interna — nao aparece em tela nem no cupom em destaque.';

comment on column pedidos.mesa_numero is
  'SEM USO. Era a plaquinha fisica (migracao 002); modelo atual nao usa mesa.';
comment on column pedidos.alerta_reuso_em is
  'SEM USO. Era do bloqueio de reuso de plaquinha (migracao 002); nao existe mais.';
comment on column pedidos.plaquinha_devolvida_em is
  'SEM USO. Era da devolucao da plaquinha (migracao 003); nao existe mais.';
comment on table mesas is
  'SEM USO no modelo atual (sem mesa/plaquinha). Ficou por seguranca, nenhum codigo le esta tabela.';

-- ------------------------------------------------------------
-- indices que so existiam por causa do bloqueio de mesa: indice
-- nao e dado, apagar e recriar nao tem risco nenhum.
-- ------------------------------------------------------------
drop index if exists idx_pedidos_numero_aberto;
drop index if exists idx_pedidos_plaquinha_fora;

-- indice novo: a tela de impressao busca exatamente "pedidos de hoje
-- que ainda nao foram impressos".
create index if not exists idx_pedidos_impressao
  on pedidos (estabelecimento_id, criado_em)
  where impresso_em is null;

-- ------------------------------------------------------------
-- CONFERE
-- ------------------------------------------------------------
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'pedidos'
  and column_name in ('nome_cliente', 'tipo_consumo', 'impresso_em', 'senha')
order by column_name;
