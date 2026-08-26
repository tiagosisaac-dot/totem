-- ============================================================
-- FOTOS DO CARDAPIO — ADORAVEL BURGUER
--
-- Liga cada hamburguer a sua foto no Storage. Rodado em 20/08/2026.
--
-- As fotos sairam de um ensaio de 389 imagens da loja. Os arquivos nao
-- tinham nome de produto: a escolha foi feita comparando o recheio com
-- a descricao do cardapio. Dois pares quase identicos:
--   Classico x Mexicano — o Classico tem tomate e maionese branca;
--     o Mexicano nao tem tomate e a maionese e amarelada (a picante).
--     Foram fotografados no mesmo dia, um atras do outro.
--   Texas x Romeu e Julieta — os dois tem molho vermelho brilhante;
--     o Texas tem alface e cebola roxa, o Romeu e Julieta nao.
--
-- DECISOES SOBRE AS FOTOS — 20/08/2026, do dono do projeto:
--   Burger Kids e Insano foram TROCADOS depois da primeira escolha. As
--     fotos originais tinham batata e refrigerante ao lado do sanduiche,
--     e no totem o cliente leria isso como acompanhamento incluso. As
--     novas mostram so o hamburguer.
--   Texas MANTIDO com a garrafa de Jack Daniel's ao fundo. Todas as 23
--     fotos desse sanduiche tem a garrafa: e o cenario do ensaio, nao
--     descuido de recorte. Foi levantado que propaganda de destilado numa
--     tela de salao tem restricao legal no Brasil, e que havia corte
--     fechado sem a garrafa. A decisao consciente foi manter.
--     NAO "corrigir" isso sem falar com ele antes.
--
-- O caminho e cardapio/<estabelecimento_id>/produtos/<produto_id>.webp,
-- tudo MINUSCULO. O endereco publico diferencia maiuscula de minuscula
-- (uma pasta "Produtos" devolve 404), mas a listagem do painel NAO
-- diferencia — da para a pasta parecer certa e a foto nao abrir. Nao
-- confiar na listagem: abrir o endereco.
--
-- O arquivo se chama <produto_id>.webp, e nao <nome>.webp, por dois
-- motivos: renomear o sanduiche nao pode quebrar a imagem, e a tela de
-- upload que ainda vai existir grava nesse mesmo caminho — assim ela
-- sobrescreve a foto no lugar, em vez de criar um arquivo orfao.
--
-- E por isso que este update cabe numa linha so: o banco monta o
-- endereco a partir do proprio id.
-- ============================================================

update produtos
set imagem_url =
  'https://mpcrwhaqrismnhblgvij.supabase.co/storage/v1/object/public'
  || '/cardapio/0d8ce944-a60e-469f-8dd5-622595fcab88/produtos/'
  || id::text || '.webp'
where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88';


-- ------------------------------------------------------------
-- CONFERENCIA — 15 linhas, nenhuma com "SEM FOTO"
-- ------------------------------------------------------------
select
  ordem,
  nome,
  coalesce(right(imagem_url, 41), 'SEM FOTO') as arquivo
from produtos
where estabelecimento_id = '0d8ce944-a60e-469f-8dd5-622595fcab88'
order by ordem;
