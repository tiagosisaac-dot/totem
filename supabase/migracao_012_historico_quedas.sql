-- ============================================================
-- MIGRACAO 012 — historico de quedas do totem (nao so estado atual)
--
-- MUDANCA DE PRODUTO: o painel central (/superadmin) precisa mostrar
-- "quantas vezes o totem caiu" pra apoiar o criterio de sucesso do
-- piloto. `totem_heartbeat` so guarda o estado ATUAL (caiu ou nao
-- agora) — nunca guardou historico. As Edge Functions `ping` e
-- `verificar-heartbeat` ja avisam no Telegram a cada queda/volta;
-- essa migracao so acrescenta gravar isso tambem, pra dar pra contar
-- depois.
-- ============================================================

create table totem_eventos (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  tipo               text not null check (tipo in ('queda', 'recuperacao')),
  criado_em          timestamptz not null default now()
);

comment on table totem_eventos is
  'Historico de quedas/recuperacoes do totem, um registro por evento. Gravado pelas Edge Functions ping (recuperacao) e verificar-heartbeat (queda), junto com o aviso no Telegram.';

create index idx_totem_eventos_estab_data on totem_eventos (estabelecimento_id, criado_em desc);

alter table totem_eventos enable row level security;

create policy evento_leitura on totem_eventos
  for select to authenticated
  using (estabelecimento_id = meu_estabelecimento() or sou_superadmin());

-- ----------------------------------------------------------
-- CONFERE
-- ----------------------------------------------------------
select policyname, cmd, roles from pg_policies where tablename = 'totem_eventos';
