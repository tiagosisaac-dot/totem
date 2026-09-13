-- ============================================================
-- MIGRACAO 013 — superadmin edita cardapio de QUALQUER loja
--
-- Rodar no SQL Editor, uma vez.
--
-- BUG QUE ESTA MIGRACAO CORRIGE:
-- As policies da migracao 005 exigiam "estabelecimento_id =
-- meu_estabelecimento() AND sou_dono()". meu_estabelecimento() devolve
-- a loja do PROPRIO perfil de quem esta logado — inclusive pro
-- superadmin. Ou seja: o Isaac so conseguia criar/editar produto e
-- categoria na loja ligada ao proprio perfil dele, nunca em loja de
-- cliente (ex.: teste-isolamento, Adoravel Burguer se o perfil dele
-- nao for daquela loja). Apareceu na pratica tentando criar produto
-- pela tela nova do /superadmin: "Nao foi possivel criar o produto."
--
-- CORRECAO: superadmin passa a poder escrever em QUALQUER loja,
-- mantendo a mesma regra de sempre pra dono (so a propria loja).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PRODUTOS
-- ------------------------------------------------------------
drop policy if exists prod_dono_insere on produtos;
drop policy if exists prod_dono_atualiza on produtos;
drop policy if exists prod_dono_apaga on produtos;

create policy prod_dono_insere on produtos for insert to authenticated
  with check (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));

create policy prod_dono_atualiza on produtos for update to authenticated
  using (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'))
  with check (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));

create policy prod_dono_apaga on produtos for delete to authenticated
  using (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));


-- ------------------------------------------------------------
-- 2. CATEGORIAS
-- ------------------------------------------------------------
drop policy if exists cat_dono_insere on categorias;
drop policy if exists cat_dono_atualiza on categorias;
drop policy if exists cat_dono_apaga on categorias;

create policy cat_dono_insere on categorias for insert to authenticated
  with check (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));

create policy cat_dono_atualiza on categorias for update to authenticated
  using (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'))
  with check (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));

create policy cat_dono_apaga on categorias for delete to authenticated
  using (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));


-- ------------------------------------------------------------
-- 3. GRUPOS DE OPCOES
-- ------------------------------------------------------------
drop policy if exists grupo_dono_insere on grupos_opcoes;
drop policy if exists grupo_dono_atualiza on grupos_opcoes;
drop policy if exists grupo_dono_apaga on grupos_opcoes;

create policy grupo_dono_insere on grupos_opcoes for insert to authenticated
  with check (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));

create policy grupo_dono_atualiza on grupos_opcoes for update to authenticated
  using (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'))
  with check (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));

create policy grupo_dono_apaga on grupos_opcoes for delete to authenticated
  using (sou_superadmin() or (estabelecimento_id = meu_estabelecimento() and meu_papel() = 'dono'));


-- ------------------------------------------------------------
-- 4. OPCOES (nao tem estabelecimento_id proprio — dono e o do grupo)
-- ------------------------------------------------------------
drop policy if exists opcao_dono_insere on opcoes;
drop policy if exists opcao_dono_atualiza on opcoes;
drop policy if exists opcao_dono_apaga on opcoes;

create policy opcao_dono_insere on opcoes for insert to authenticated
  with check (
    sou_superadmin()
    or (
      meu_papel() = 'dono'
      and exists (
        select 1 from grupos_opcoes g
        where g.id = opcoes.grupo_id and g.estabelecimento_id = meu_estabelecimento()
      )
    )
  );

create policy opcao_dono_atualiza on opcoes for update to authenticated
  using (
    sou_superadmin()
    or (
      meu_papel() = 'dono'
      and exists (
        select 1 from grupos_opcoes g
        where g.id = opcoes.grupo_id and g.estabelecimento_id = meu_estabelecimento()
      )
    )
  );

create policy opcao_dono_apaga on opcoes for delete to authenticated
  using (
    sou_superadmin()
    or (
      meu_papel() = 'dono'
      and exists (
        select 1 from grupos_opcoes g
        where g.id = opcoes.grupo_id and g.estabelecimento_id = meu_estabelecimento()
      )
    )
  );


-- ============================================================
-- CONFERE — repete a mesma checagem da migracao 005
-- ============================================================
select
  tablename           as tabela,
  policyname          as policy,
  cmd                 as comando,
  case
    when cmd = 'SELECT'                                             then 'leitura publica'
    when coalesce(qual, '') like '%sou_superadmin%'
      or coalesce(with_check, '') like '%sou_superadmin%'            then 'dono OU superadmin'
    else '⚠️ ABERTO — CONFERIR'
  end                 as quem_pode
from pg_policies
where schemaname = 'public'
  and tablename in ('produtos', 'categorias', 'grupos_opcoes', 'opcoes')
order by tablename, cmd, policyname;
