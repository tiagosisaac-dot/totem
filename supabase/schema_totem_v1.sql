-- ============================================================
-- SISTEMA DE TOTEM DE AUTOATENDIMENTO — SCHEMA v1 (Fase 1)
-- Postgres / Supabase
--
-- Como usar:
--   1. Crie um projeto no Supabase
--   2. Abra SQL Editor > New query
--   3. Cole este arquivo inteiro e execute (Run)
--
-- Desenho: multi-tenant desde o dia 1.
-- Toda tabela de conteudo carrega estabelecimento_id.
-- ============================================================


-- ============================================================
-- 1. ESTABELECIMENTOS (os tenants — seus clientes)
-- ============================================================

create table estabelecimentos (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,          -- ex: 'burger-do-ze' -> /burger-do-ze
  nome              text not null,
  logo_url          text,
  cor_primaria      text default '#111111',
  cor_secundaria    text default '#F5F5F5',

  -- controle comercial (SaaS)
  ativo             boolean not null default true,  -- desligado por voce
  bloqueado         boolean not null default false,  -- inadimplencia
  mensagem_bloqueio text default 'Sistema temporariamente indisponível.',

  -- operacao
  aceita_pedidos    boolean not null default true,  -- o dono pausa o totem
  fuso              text not null default 'America/Sao_Paulo',

  config            jsonb default '{}'::jsonb,      -- flags futuras sem migration
  criado_em         timestamptz not null default now()
);

comment on column estabelecimentos.config is
  'Configuracoes soltas: {"exige_mesa": true, "mostra_tempo_preparo": false}';


-- ============================================================
-- 2. PERFIS DE ACESSO (dono, operador de cozinha, voce)
-- ============================================================

create type papel_usuario as enum ('superadmin', 'dono', 'cozinha');

create table perfis (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  estabelecimento_id uuid references estabelecimentos(id) on delete cascade,
  papel              papel_usuario not null default 'dono',
  nome               text,
  criado_em          timestamptz not null default now()
);

-- superadmin (voce) tem estabelecimento_id nulo e ve tudo


-- ============================================================
-- 3. MESAS
-- ============================================================

create table mesas (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  numero             int not null,
  ativa              boolean not null default true,
  unique (estabelecimento_id, numero)
);


-- ============================================================
-- 4. CARDAPIO
-- ============================================================

create table categorias (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  nome               text not null,          -- 'Hambúrgueres', 'Bebidas'
  imagem_url         text,
  ordem              int not null default 0,
  ativa              boolean not null default true
);

create type tipo_produto as enum ('simples', 'combo');

create table produtos (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  categoria_id       uuid references categorias(id) on delete set null,
  nome               text not null,
  descricao          text,
  preco              numeric(10,2) not null check (preco >= 0),
  imagem_url         text,
  tipo               tipo_produto not null default 'simples',
  disponivel         boolean not null default true,   -- botao "esgotou" do dono
  vendavel_sozinho   boolean not null default true,   -- false = so existe dentro de combo
  ordem              int not null default 0,
  criado_em          timestamptz not null default now()
);


-- ============================================================
-- 5. PERSONALIZACAO — grupos reutilizaveis
--
--    'adicional' -> soma preco     (+ Bacon R$ 4,00)
--    'remocao'   -> preco zero     (Sem cebola)
--    'escolha'   -> obrigatoria    (Ponto da carne: ao ponto / bem passada)
--
-- Um grupo e ligado a MUITOS produtos (produto_grupos).
-- Mudar o preco do bacon = editar UMA linha.
-- ============================================================

create type tipo_grupo as enum ('adicional', 'remocao', 'escolha');

create table grupos_opcoes (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  nome               text not null,          -- 'Adicionais de sanduíche'
  tipo               tipo_grupo not null,
  min_selecao        int not null default 0,
  max_selecao        int,                     -- null = sem limite
  ativo              boolean not null default true,
  check (max_selecao is null or max_selecao >= min_selecao)
);

create table opcoes (
  id              uuid primary key default gen_random_uuid(),
  grupo_id        uuid not null references grupos_opcoes(id) on delete cascade,
  nome            text not null,             -- 'Bacon', 'Sem cebola'
  preco_adicional numeric(10,2) not null default 0 check (preco_adicional >= 0),
  disponivel      boolean not null default true,
  ordem           int not null default 0
);

create table produto_grupos (
  produto_id uuid not null references produtos(id) on delete cascade,
  grupo_id   uuid not null references grupos_opcoes(id) on delete cascade,
  ordem      int not null default 0,
  primary key (produto_id, grupo_id)
);


-- ============================================================
-- 6. COMBOS
--
-- Combo NAO e adicional: e um produto que contem outros produtos.
--   Slot 'Escolha o sanduíche'  -> 8 opcoes, escolhe 1
--   Slot 'Escolha a bebida'     -> 5 opcoes, escolhe 1
-- preco_adicional permite upgrade ("refri 600ml +R$ 3,00")
-- ============================================================

create table combo_slots (
  id          uuid primary key default gen_random_uuid(),
  combo_id    uuid not null references produtos(id) on delete cascade,
  nome        text not null,
  min_selecao int not null default 1,
  max_selecao int not null default 1,
  ordem       int not null default 0
);

create table combo_slot_produtos (
  slot_id         uuid not null references combo_slots(id) on delete cascade,
  produto_id      uuid not null references produtos(id) on delete cascade,
  preco_adicional numeric(10,2) not null default 0,
  primary key (slot_id, produto_id)
);


-- ============================================================
-- 7. PEDIDOS
--
-- ATENCAO: tudo que afeta dinheiro e SNAPSHOT (copia).
-- O historico de vendas nunca muda quando o cardapio muda.
-- ============================================================

create type status_pedido as enum (
  'aguardando_pagamento',
  'em_producao',
  'pronto',
  'entregue',
  'cancelado'
);

create table pedidos (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete restrict,

  senha              int not null,            -- sequencial do dia
  mesa_numero        int,                     -- null = retirada no balcao
  status             status_pedido not null default 'aguardando_pagamento',

  total              numeric(10,2) not null,  -- CALCULADO NO SERVIDOR
  pago               boolean not null default false,
  forma_pagamento    text,                    -- 'caixa' | 'pix' | 'cartao'

  observacao         text,
  origem             text default 'totem',

  criado_em          timestamptz not null default now(),
  producao_em        timestamptz,
  pronto_em          timestamptz,
  entregue_em        timestamptz
);

create table pedido_itens (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references pedidos(id) on delete cascade,
  produto_id     uuid references produtos(id) on delete set null,

  nome_snap      text not null,               -- copia do nome
  preco_snap     numeric(10,2) not null,      -- copia do preco base
  quantidade     int not null default 1 check (quantidade > 0),
  subtotal       numeric(10,2) not null,      -- (base + opcoes) * qtd

  observacao     text,                        -- texto livre do cliente
  combo_pai_id   uuid references pedido_itens(id) on delete cascade
);

comment on column pedido_itens.combo_pai_id is
  'Itens escolhidos dentro de um combo apontam para a linha do combo';

create table pedido_item_opcoes (
  id             uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references pedido_itens(id) on delete cascade,
  opcao_id       uuid references opcoes(id) on delete set null,
  nome_snap      text not null,
  preco_snap     numeric(10,2) not null default 0
);


-- ============================================================
-- 8. SENHA SEQUENCIAL DIARIA (no fuso do estabelecimento)
--
-- Usar current_date puro = a senha zera as 21h em Brasilia,
-- porque o Postgres trabalha em UTC. Erro fatal em hamburgueria.
-- ============================================================

create table contadores_senha (
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  dia_operacao       date not null,
  ultimo_numero      int not null default 0,
  primary key (estabelecimento_id, dia_operacao)
);

create or replace function proxima_senha(p_estabelecimento uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fuso   text;
  v_dia    date;
  v_numero int;
begin
  select fuso into v_fuso
    from estabelecimentos where id = p_estabelecimento;

  if v_fuso is null then
    raise exception 'Estabelecimento não encontrado: %', p_estabelecimento;
  end if;

  v_dia := (now() at time zone v_fuso)::date;

  insert into contadores_senha (estabelecimento_id, dia_operacao, ultimo_numero)
  values (p_estabelecimento, v_dia, 1)
  on conflict (estabelecimento_id, dia_operacao)
    do update set ultimo_numero = contadores_senha.ultimo_numero + 1
  returning ultimo_numero into v_numero;

  return v_numero;
end;
$$;


-- ============================================================
-- 9. INDICES
-- ============================================================

create index idx_produtos_estab      on produtos (estabelecimento_id, categoria_id);
create index idx_produtos_disp       on produtos (estabelecimento_id) where disponivel;
create index idx_categorias_estab    on categorias (estabelecimento_id, ordem);
create index idx_grupos_estab        on grupos_opcoes (estabelecimento_id);
create index idx_opcoes_grupo        on opcoes (grupo_id, ordem);
create index idx_pedidos_kds         on pedidos (estabelecimento_id, status, criado_em);
create index idx_pedidos_dia         on pedidos (estabelecimento_id, criado_em desc);
create index idx_itens_pedido        on pedido_itens (pedido_id);
create index idx_item_opcoes         on pedido_item_opcoes (pedido_item_id);


-- ============================================================
-- 10. RLS (Row Level Security)
--
-- Regra de ouro:
--   - CARDAPIO: leitura publica (o totem nao precisa de login)
--   - PEDIDOS:  anon NAO escreve direto. Passa por Edge Function,
--               que recalcula o total no servidor.
--   - PAINEL:   usuario logado ve apenas o proprio estabelecimento
-- ============================================================

alter table estabelecimentos    enable row level security;
alter table perfis              enable row level security;
alter table mesas               enable row level security;
alter table categorias          enable row level security;
alter table produtos            enable row level security;
alter table grupos_opcoes       enable row level security;
alter table opcoes              enable row level security;
alter table produto_grupos      enable row level security;
alter table combo_slots         enable row level security;
alter table combo_slot_produtos enable row level security;
alter table pedidos             enable row level security;
alter table pedido_itens        enable row level security;
alter table pedido_item_opcoes  enable row level security;
alter table contadores_senha    enable row level security;

-- helper: estabelecimento do usuario logado
create or replace function meu_estabelecimento()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select estabelecimento_id from perfis where user_id = auth.uid();
$$;

create or replace function sou_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis where user_id = auth.uid() and papel = 'superadmin'
  );
$$;

-- perfis: cada um le o proprio
create policy perfil_proprio on perfis
  for select using (user_id = auth.uid() or sou_superadmin());

-- estabelecimento: totem le so o que esta ativo e nao bloqueado
create policy estab_publico on estabelecimentos
  for select to anon
  using (ativo and not bloqueado);

create policy estab_logado on estabelecimentos
  for select to authenticated
  using (id = meu_estabelecimento() or sou_superadmin());

create policy estab_dono_edita on estabelecimentos
  for update to authenticated
  using (id = meu_estabelecimento())
  with check (id = meu_estabelecimento());

-- cardapio: leitura publica
create policy cat_publico   on categorias    for select to anon, authenticated using (true);
create policy prod_publico  on produtos      for select to anon, authenticated using (true);
create policy grupo_publico on grupos_opcoes for select to anon, authenticated using (true);
create policy opcao_publico on opcoes        for select to anon, authenticated using (true);
create policy pg_publico    on produto_grupos      for select to anon, authenticated using (true);
create policy cs_publico    on combo_slots         for select to anon, authenticated using (true);
create policy csp_publico   on combo_slot_produtos for select to anon, authenticated using (true);
create policy mesa_publico  on mesas         for select to anon, authenticated using (ativa);

-- cardapio: escrita apenas pelo dono
create policy cat_dono   on categorias for all to authenticated
  using (estabelecimento_id = meu_estabelecimento())
  with check (estabelecimento_id = meu_estabelecimento());

create policy prod_dono  on produtos for all to authenticated
  using (estabelecimento_id = meu_estabelecimento())
  with check (estabelecimento_id = meu_estabelecimento());

create policy grupo_dono on grupos_opcoes for all to authenticated
  using (estabelecimento_id = meu_estabelecimento())
  with check (estabelecimento_id = meu_estabelecimento());

create policy opcao_dono on opcoes for all to authenticated
  using (exists (
    select 1 from grupos_opcoes g
    where g.id = opcoes.grupo_id and g.estabelecimento_id = meu_estabelecimento()
  ));

-- pedidos: NENHUMA policy para anon (insercao so via Edge Function)
create policy pedido_equipe on pedidos for select to authenticated
  using (estabelecimento_id = meu_estabelecimento() or sou_superadmin());

create policy pedido_equipe_upd on pedidos for update to authenticated
  using (estabelecimento_id = meu_estabelecimento());

create policy item_equipe on pedido_itens for select to authenticated
  using (exists (
    select 1 from pedidos p
    where p.id = pedido_itens.pedido_id
      and (p.estabelecimento_id = meu_estabelecimento() or sou_superadmin())
  ));

create policy itemop_equipe on pedido_item_opcoes for select to authenticated
  using (exists (
    select 1 from pedido_itens i
    join pedidos p on p.id = i.pedido_id
    where i.id = pedido_item_opcoes.pedido_item_id
      and (p.estabelecimento_id = meu_estabelecimento() or sou_superadmin())
  ));


-- ============================================================
-- 11. REALTIME (KDS da cozinha atualiza sozinho)
-- ============================================================

alter publication supabase_realtime add table pedidos;
alter publication supabase_realtime add table pedido_itens;


-- ============================================================
-- FIM. Proximo passo: Edge Function 'criar-pedido'
-- (recebe itens escolhidos, recalcula total, chama proxima_senha,
--  grava com service_role)
-- ============================================================
