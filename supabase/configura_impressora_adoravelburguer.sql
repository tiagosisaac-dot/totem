-- ============================================================
-- Configura o nome da impressora do Adoravel Burguer
--
-- Roda DEPOIS de instalar o QZ Tray no computador da loja e a i9
-- aparecer como impressora do Windows. O nome tem que ser EXATAMENTE
-- igual ao que aparece em "Impressoras e scanners" do Windows —
-- troque o texto 'NOME-EXATO-DA-IMPRESSORA' abaixo por esse nome
-- antes de rodar.
-- ============================================================

update estabelecimentos
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object('impressora_nome', 'NOME-EXATO-DA-IMPRESSORA')
where id = '0d8ce944-a60e-469f-8dd5-622595fcab88';

-- confere
select slug, config -> 'impressora_nome' as impressora_nome
from estabelecimentos
where id = '0d8ce944-a60e-469f-8dd5-622595fcab88';
