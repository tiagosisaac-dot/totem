-- ============================================================
-- MIGRACAO 006 — Heartbeat do totem
--
-- REGRA 6: toda tabela nova sai da migration com suas policies.
--
-- O totem manda um sinal de vida a cada minuto (Edge Function
-- "ping", ainda a publicar). Uma tarefa agendada (pg_cron) confere
-- a cada minuto se algum totem parou de mandar sinal e avisa o
-- Isaac pelo Telegram (Edge Function "verificar-heartbeat", ainda
-- a publicar).
--
-- alertado_em existe para nao repetir o mesmo aviso toda vez que o
-- cron roda: so alerta uma vez por queda, e destrava sozinho quando
-- o ping volta (a Edge Function "ping" zera o campo).
-- ============================================================

create table totem_heartbeat (
  estabelecimento_id uuid primary key references estabelecimentos(id) on delete cascade,
  ultimo_ping timestamptz not null default now(),
  alertado_em timestamptz
);

alter table totem_heartbeat enable row level security;

-- Ninguem le ou escreve direto nessa tabela: o totem e o cron falam
-- so por Edge Function, que usa service_role e pula RLS. A unica
-- porta aberta aqui e leitura para o superadmin, para o dia que
-- existir uma tela de status.
create policy heartbeat_superadmin_le on totem_heartbeat
  for select to authenticated
  using (sou_superadmin());

-- ------------------------------------------------------------
-- Agendamento: chama a Edge Function verificar-heartbeat a cada
-- minuto. A funcao decide sozinha quem esta caido e quem avisar.
--
-- Se der erro de permissao aqui, é porque pg_cron/pg_net ainda não
-- foram ligados neste projeto: Database → Extensions → habilitar
-- "pg_cron" e "pg_net" no painel do Supabase, depois rodar só este
-- bloco de novo (o create table acima não precisa repetir).
--
-- A chave usada no Authorization abaixo é a "anon", a mesma que já
-- fica em app/.env.local — pública de propósito, não é segredo.
-- ------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'verificar-heartbeat-totem',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://mpcrwhaqrismnhblgvij.supabase.co/functions/v1/verificar-heartbeat',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wY3J3aGFxcmlzbW5oYmxndmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMDU2MzgsImV4cCI6MjEwMDY4MTYzOH0.ujxhJlXSUyRw9_q0cFfK4IPsG6vhtsE0d0fOArJ8tKU'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ------------------------------------------------------------
-- PAUSADO EM 15/08/2026, de proposito.
--
-- Enquanto nao existe tablet ligado o dia todo, "sem sinal" e o
-- estado normal — o aviso dispararia a noite inteira e viraria
-- ruido. Alarme que toca sem motivo e alarme que se aprende a
-- ignorar; quando o piloto cair de verdade, o aviso precisa
-- significar alguma coisa.
--
-- Rodado apos o bloco acima:
--   select cron.unschedule('verificar-heartbeat-totem');
--
-- RELIGAR quando o tablet do piloto entrar em operacao: rodar de
-- novo so o cron.schedule acima. A tabela e as Edge Functions
-- continuam no ar; o que esta pausado e apenas a conferencia.
-- ------------------------------------------------------------
