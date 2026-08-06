-- ============================================================
-- MIGRACAO 005 — só o dono edita o cardápio
--
-- Rodar no SQL Editor, uma vez, depois da migração 004.
--
-- PROBLEMA QUE ESTA MIGRACAO FECHA:
-- As policies originais diziam "pode mexer no cardápio quem pertence
-- a este estabelecimento", sem distinguir papel. Ou seja: o login da
-- cozinha conseguia alterar preço.
--
-- O painel do dono confere o papel na tela, mas tela não segura
-- ninguém que saiba o que está fazendo. Preço é dinheiro; a regra
-- tem que estar no banco.
--
-- ESCOPO: cardápio inteiro (produtos, categorias, grupos e opções).
-- Fechar só o preço não protegeria nada — quem pudesse apagar uma
-- categoria só teria mudado o problema de lugar.
--
-- FORA DE ESCOPO, de propósito: editar o próprio estabelecimento
-- (cores, logo, aceita_pedidos). Pausar o totem quando a cozinha está
-- afogada é plausivelmente ação da cozinha. Decisão pendente.
-- ============================================================


-- ------------------------------------------------------------
-- 1. AUXILIAR: quem está logado é dono?
--
-- security definer porque precisa ler 'perfis' independentemente das
-- policies de quem chamou.
-- ------------------------------------------------------------
create or replace function meu_papel()
returns papel_usuario
language sql
stable
security definer
set search_path = public
as $$
  select papel from perfis where user_id = auth.uid();
$$;

create or replace function sou_dono()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(meu_papel() in ('dono', 'superadmin'), false);
$$;

comment on function sou_dono is
  'Dono do estabelecimento ou superadmin (Isaac). Cozinha nao entra.';


-- ------------------------------------------------------------
-- 2. PRODUTOS
--
-- A leitura continua PÚBLICA (policy prod_publico, intocada): o totem
-- não faz login e precisa mostrar o cardápio.
-- O que muda é só escrita.
-- ------------------------------------------------------------
drop policy if exists prod_dono on produtos;

create policy prod_dono_insere on produtos for insert to authenticated
  with check (estabelecimento_id = meu_estabelecimento() and sou_dono());

create policy prod_dono_atualiza on produtos for update to authenticated
  using (estabelecimento_id = meu_estabelecimento() and sou_dono())
  with check (estabelecimento_id = meu_estabelecimento() and sou_dono());

create policy prod_dono_apaga on produtos for delete to authenticated
  using (estabelecimento_id = meu_estabelecimento() and sou_dono());


-- ------------------------------------------------------------
-- 3. CATEGORIAS
-- ------------------------------------------------------------
drop policy if exists cat_dono on categorias;

create policy cat_dono_insere on categorias for insert to authenticated
  with check (estabelecimento_id = meu_estabelecimento() and sou_dono());

create policy cat_dono_atualiza on categorias for update to authenticated
  using (estabelecimento_id = meu_estabelecimento() and sou_dono())
  with check (estabelecimento_id = meu_estabelecimento() and sou_dono());

create policy cat_dono_apaga on categorias for delete to authenticated
  using (estabelecimento_id = meu_estabelecimento() and sou_dono());


-- ------------------------------------------------------------
-- 4. GRUPOS DE OPCOES
-- ------------------------------------------------------------
drop policy if exists grupo_dono on grupos_opcoes;

create policy grupo_dono_insere on grupos_opcoes for insert to authenticated
  with check (estabelecimento_id = meu_estabelecimento() and sou_dono());

create policy grupo_dono_atualiza on grupos_opcoes for update to authenticated
  using (estabelecimento_id = meu_estabelecimento() and sou_dono())
  with check (estabelecimento_id = meu_estabelecimento() and sou_dono());

create policy grupo_dono_apaga on grupos_opcoes for delete to authenticated
  using (estabelecimento_id = meu_estabelecimento() and sou_dono());


-- ------------------------------------------------------------
-- 5. OPCOES
--
-- 'opcoes' nao carrega estabelecimento_id: o dono dela e o dono do
-- grupo a que ela pertence.
-- ------------------------------------------------------------
drop policy if exists opcao_dono on opcoes;

create policy opcao_dono_insere on opcoes for insert to authenticated
  with check (
    sou_dono()
    and exists (
      select 1 from grupos_opcoes g
      where g.id = opcoes.grupo_id and g.estabelecimento_id = meu_estabelecimento()
    )
  );

create policy opcao_dono_atualiza on opcoes for update to authenticated
  using (
    sou_dono()
    and exists (
      select 1 from grupos_opcoes g
      where g.id = opcoes.grupo_id and g.estabelecimento_id = meu_estabelecimento()
    )
  );

create policy opcao_dono_apaga on opcoes for delete to authenticated
  using (
    sou_dono()
    and exists (
      select 1 from grupos_opcoes g
      where g.id = opcoes.grupo_id and g.estabelecimento_id = meu_estabelecimento()
    )
  );


-- ============================================================
-- CONFERE — quem pode escrever no cardapio agora
--
-- Esperado: nenhuma linha de escrita (INSERT/UPDATE/DELETE) sem
-- 'sou_dono()' na condicao. A leitura publica continua sem ele.
-- ============================================================
select
  tablename           as tabela,
  policyname          as policy,
  cmd                 as comando,
  case
    when cmd = 'SELECT'                                            then 'leitura publica'
    when coalesce(qual, '') like '%sou_dono%'
      or coalesce(with_check, '') like '%sou_dono%'                 then 'so dono'
    else '⚠️ ABERTO — CONFERIR'
  end                 as quem_pode
from pg_policies
where schemaname = 'public'
  and tablename in ('produtos', 'categorias', 'grupos_opcoes', 'opcoes')
order by tablename, cmd, policyname;
