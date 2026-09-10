-- ============================================================
-- MIGRACAO 011 — superadmin pode bloquear/desbloquear qualquer loja
--
-- MUDANCA DE PRODUTO: painel central (/superadmin) pra Isaac controlar
-- todos os clientes, sem precisar rodar SQL a mao pra bloquear um
-- estabelecimento inadimplente.
--
-- A policy de update em estabelecimentos so deixava o PROPRIO dono
-- editar (mudar cor, etc). Superadmin ja podia LER todas as lojas
-- (policy estab_logado), mas nao tinha permissao de ESCREVER em
-- nenhuma que nao fosse a dele — precisa de uma policy propria.
-- ============================================================

create policy estab_superadmin_edita on estabelecimentos
  for update to authenticated
  using (sou_superadmin())
  with check (sou_superadmin());

-- ----------------------------------------------------------
-- CONFERE
-- ----------------------------------------------------------
select policyname, cmd, roles
from pg_policies
where tablename = 'estabelecimentos'
order by policyname;
