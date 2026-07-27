-- ============================================================
-- STORAGE — bucket 'cardapio'
-- Rodar DEPOIS do schema_totem_v1.sql
--
-- Antes de executar, crie o bucket pelo painel:
--   Storage > New bucket
--   Nome: cardapio
--   Public bucket: SIM  (fotos de cardapio sao publicas de proposito)
--
-- Estrutura de pastas:
--   cardapio/<estabelecimento_id>/logo.webp
--   cardapio/<estabelecimento_id>/produtos/<produto_id>.webp
--
-- Regra: LEITURA publica, ESCRITA so na propria pasta.
-- ============================================================


-- ------------------------------------------------------------
-- LEITURA: qualquer um le (o totem nao faz login)
-- ------------------------------------------------------------
create policy "cardapio_leitura_publica"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'cardapio');


-- ------------------------------------------------------------
-- ESCRITA: o dono so grava dentro da pasta do proprio
-- estabelecimento. storage.foldername(name) devolve as pastas
-- do caminho; a posicao [1] e a raiz, que e o UUID do tenant.
-- ------------------------------------------------------------
create policy "cardapio_upload_proprio"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cardapio'
  and (storage.foldername(name))[1] = meu_estabelecimento()::text
);

create policy "cardapio_update_proprio"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cardapio'
  and (storage.foldername(name))[1] = meu_estabelecimento()::text
);

create policy "cardapio_delete_proprio"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cardapio'
  and (storage.foldername(name))[1] = meu_estabelecimento()::text
);


-- ------------------------------------------------------------
-- SUPERADMIN (voce): acesso total
-- ------------------------------------------------------------
create policy "cardapio_superadmin"
on storage.objects for all
to authenticated
using (bucket_id = 'cardapio' and sou_superadmin())
with check (bucket_id = 'cardapio' and sou_superadmin());


-- ============================================================
-- TESTE RAPIDO (faca isso, nao pule)
--
-- 1. Logue como o dono do estabelecimento A
-- 2. Tente subir um arquivo em: <id_do_B>/teste.webp
-- 3. Tem que dar erro de permissao
--
-- Se subir, a policy esta errada e todo o isolamento e ficticio.
-- ============================================================
