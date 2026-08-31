# ESTADO — onde paramos

> **Atualizado em 29/08/2026.**
> Este arquivo é o retrato do projeto num dia. O `CLAUDE.md` explica **como** as
> coisas funcionam e **por quê**; aqui fica **até onde chegamos**. Quando os dois
> discordarem, o `CLAUDE.md` está certo — é ele que é mantido junto do código.

---

## Em uma frase

Mudança grande em 29/08/2026: **saiu mesa/plaquinha e as telas de cozinha e
balcão** do Adorável Burguer. O cliente digita o próprio nome e escolhe
comer aqui/levar; o pedido some numa nova tela `/impressora` que manda
imprimir na Bematech i9 via QZ Tray. **Código pronto e commitado, mas ainda
NADA disso rodou na loja de verdade** — falta o Isaac rodar a migração 008,
publicar, e instalar/testar o QZ Tray na impressora física.

---

## 0. Mudança de 29/08/2026 — sem mesa, impressão em vez de tela (AINDA NÃO NO AR)

Pedido do dono: papel impresso na Bematech i9 (mesma do Anota Aí) substitui de
vez a tela de cozinha/balcão e a plaquinha física. Sem mesa: o cliente escolhe
comer aqui/levar e digita o próprio nome, que sai no cupom. Código escrito e
commitado nesta sessão — **falta rodar**:

1. Isaac roda `supabase/migracao_008_senha_e_impressao.sql` no SQL Editor
2. `git push` publica (totem sem mesa, `/cozinha` e `/balcao` removidas do
   código, `/impressora` nova)
3. Republicar a Edge Function `criar-pedido`
4. Isaac instala o QZ Tray no computador da loja, configura a i9, roda
   `supabase/configura_impressora_adoravelburguer.sql` com o nome exato
5. Testar um pedido de verdade e ajustar `app/src/lib/cupom.js` conforme o
   papel que sair — formato ainda **não visto saindo de uma impressora real**

Detalhe técnico e o "porquê" de cada peça: `CLAUDE.md`, seção "Impressão do
pedido (QZ Tray)".

---

## 1. O que já está no ar e funcionando

**Endereço:** `totem-vert.vercel.app/adoravelburguer`
A Vercel republica sozinha a cada `git push`. Não existe passo de deploy.
**A mudança da seção 0 ainda NÃO foi publicada** — o que está no ar hoje ainda
é o fluxo com número de mesa e as telas de cozinha/balcão.

* **Fase 1 fechada.** Tela inicial → cardápio → produto → carrinho → número da
  mesa → confirmação, e volta sozinho ao início.
* **Cozinha e balcão** em lista, com cor avisando o pedido que atrasou.
* **Cardápio real** do Adorável Burguer: 15 hambúrgueres, bebidas, 5 porções de
  batata frita e 5 sabores de milkshake, 40 mesas.
* **Combo funcionando.** Grupo de opção condicional: só aparece (e só é exigido)
  escolher a bebida do combo depois de marcar "Transformar em combo" — antes
  dava pra pegar a bebida sem pagar os R$15. Migração 007 + Edge Function
  `criar-pedido` republicada + `combo_transformar_burger.sql` — os três passos
  confirmados feitos pelo Isaac em 27/08/2026.
* **Pedido testado de ponta a ponta em 28/08/2026, confirmado 100%.** Pedido de
  combo (Saint Brie + Coca-Cola Normal, R$58,00) enviado pelo site publicado na
  mesa 40: grupo condicional travou até escolher bebida, preço bateu, pedido
  chegou certo tanto na cozinha quanto no balcão (confirmado pelo Isaac), e a
  plaquinha foi devolvida normalmente. Loja estava aberta mas tablet e telas de
  cozinha/balcão ainda não instalados fisicamente, sem risco pra operação.
* **Carrinho:** dá pra tirar 1 de uma linha com 2+ iguais sem apagar a linha
  inteira (**−**/**+**), e o adicional escolhido avisa que vale pra linha toda.
  Também limpa (com confirmação, se tiver item) ao voltar pro início, e a
  inatividade caiu de 75s para 25s.
* **Cardápio de teste apagado** em 20/08/2026. Não sobrou nada de teste no banco.
* **Fotos dos 15 hambúrgueres** no Storage, ligadas aos produtos. Batata frita e
  milkshake **ficam sem foto por decisão** (28/08/2026) — não é falta, é escolha
  do Isaac por enquanto. O totem precisa mostrar bem esses produtos sem foto
  (sem buraco/quebrado no cartão); se algum dia isso incomodar visualmente, é
  o sinal pra revisitar a decisão, não bug.
* **Só o dono edita preço** (migração 005). Cliente não tem essa policy.
* **Heartbeat** pronto (migração 006), mas com a conferência **pausada** — ver
  seção 5.

---

## 2. As fotos — o que subiu

Saíram de um ensaio de **389 imagens** da loja, sem nome de produto. A escolha
foi feita comparando o recheio de cada foto com a descrição do cardápio.

**Onde estão:**
`cardapio/0d8ce944-a60e-469f-8dd5-622595fcab88/produtos/<produto_id>.webp`

**Tudo minúsculo.** O endereço público diferencia maiúscula de minúscula e uma
pasta `Produtos` devolve 404 — mas a listagem do painel **não** diferencia, então
dá para a pasta parecer certa e a imagem não abrir. Não confiar na listagem:
abrir o endereço.

Os arquivos se chamam pelo `produto_id`, não pelo nome do sanduíche. Assim
renomear o produto não quebra a imagem, e a futura tela de upload grava no mesmo
caminho em vez de deixar arquivo órfão.

| # | Produto | foto do ensaio | tamanho |
|---|---------|---------------:|--------:|
|  1 | Juan | 381 | 66 KB |
|  2 | Insano Burger | **327** | 115 KB |
|  3 | Saint Brie | 313 | 81 KB |
|  4 | Adorável Burger | 275 | 72 KB |
|  5 | Texas Burger | 259 | 98 KB |
|  6 | Australiano | 213 | 82 KB |
|  7 | Bacon Cheese | 191 | 70 KB |
|  8 | Divino | 168 | 73 KB |
|  9 | Tropical | 140 | 82 KB |
| 10 | Romeu e Julieta | 115 | 86 KB |
| 11 | Americano | 97 | 97 KB |
| 12 | Mexicano 🌶️ | 76 | 82 KB |
| 13 | Clássico | 48 | 77 KB |
| 14 | Bigtella | 30 | 108 KB |
| 15 | Burger Kids | **12** | 99 KB |

**1,3 MB no total**, recortadas em 4:3 (o formato do cartão do totem) e em WebP.
Os dois em negrito foram trocados depois da primeira escolha: as fotos originais
tinham batata e refrigerante ao lado, e no totem isso seria lido como
acompanhamento incluso.

O ensaio completo e a lista de qual arquivo é de quem estão fora do repositório,
em `Desktop\fotos-cardapio-totem\`. As 389 originais continuam intactas no zip.

**Dois pares quase idênticos**, para quem for conferir depois:

* **Clássico × Mexicano** — o Clássico tem tomate e maionese branca; o Mexicano
  não tem tomate e a maionese é amarelada (a picante). Foram fotografados um
  atrás do outro, no mesmo dia.
* **Texas × Romeu e Julieta** — os dois têm molho vermelho brilhante; o Texas tem
  alface e cebola roxa, o Romeu e Julieta não.

---

## 3. Bug que passou pela produção (corrigido)

A migração 007 (coluna `depende_da_opcao_id`, para o grupo condicional do combo)
criou um **segundo caminho** de relação entre `grupos_opcoes` e `opcoes`. O
PostgREST passou a recusar (erro `PGRST201`, relação ambígua) a consulta que
embute `opcoes` dentro de `grupos_opcoes` — isso **quebrou a abertura de
qualquer produto** no site publicado, não só os do combo.

Corrigido nomeando a relação explicitamente (`opcoes!opcoes_grupo_id_fkey`) em
`app/src/componentes/Produto.jsx`, commit `cc5d7e9`, testado direto contra a API
antes do commit e já publicado.

**Fica registrado como armadilha (seção 6) para a próxima migração que adicionar
uma segunda FK entre duas tabelas que já se relacionam.**

---

## 4. O que falta para o piloto rodar

0. **Publicar a mudança de mesa/impressão da seção 0** — é a maior pendência
   agora, ver os 5 passos lá em cima.
1. **Religar a conferência do heartbeat.** Está pausada de propósito
   (`cron.unschedule`): sem tablet ligado o dia todo, "sem sinal" é o estado
   normal e o aviso vira ruído. O comando para religar está no fim de
   `supabase/migracao_006_heartbeat_totem.sql`. **Religar junto com o piloto.**
2. **Tela de upload de foto pelo dono.** Hoje quem sobe foto é o Isaac, pelo
   painel do Supabase. O dono nunca recebe credencial do bucket. **Obs:** isso
   é parte de "cadastro de cardápio pelo dono", que o `docs/PRD.md` marca como
   fora do escopo da Fase 1 — não é bloqueio real pro piloto, só ficou nessa
   lista por engano.
**Item "testar pedido de ponta a ponta com o combo real" saiu desta lista —
confirmado 100% em 28/08/2026, ver seção 1.**

---

## 5. Decisões pendentes

As de negócio estão marcadas **A DEFINIR** no `docs/PRD.md`. Não são detalhe:
são elas que decidem se o piloto vira produto ou fica sendo favor.

* **Mensalidade** — quanto custa por estabelecimento
* **Tablet** — do dono, alugado, ou incluído no preço
* ~~Plaquinhas de mesa~~ — **não se aplica mais** (29/08/2026): o Adorável
  Burguer não usa mesa nem plaquinha, o pedido é identificado por nome + cupom
  impresso. Fica valendo só se um cliente futuro pedir o modelo antigo
* **Piloto** — quantos tablets, data de início, quanto tempo antes de decidir
* **Critério de sucesso** — o que precisa acontecer para valer a pena continuar
* **Suporte** — como o dono chama alguém no meio do movimento, quando o totem
  para e a fila está andando

**Uma decisão técnica em aberto:** hoje `dev` e `prod` apontam para o **mesmo**
projeto Supabase. Funciona, mas significa que um teste malfeito mexe no que está
no ar. Separar dá trabalho e ainda não foi feito.

---

## 6. Armadilhas já pagas

Coisas que custaram tempo uma vez. Não custar duas vezes é o motivo deste arquivo.

* **Segunda FK entre as mesmas duas tabelas quebra o PostgREST.** A migração
  007 ligou `grupos_opcoes` e `opcoes` por um segundo caminho
  (`depende_da_opcao_id`), e a consulta que embute uma tabela dentro da outra
  passou a dar erro de relação ambígua (`PGRST201`) — quebrando o site inteiro,
  não só a parte nova. **Toda consulta embutida (`select("*, opcoes(*)")`) que
  envolver uma tabela com mais de uma FK para a outra precisa nomear a relação
  explicitamente** (`opcoes!opcoes_grupo_id_fkey`). Ver seção 3.
* **Caminho do Storage em maiúscula.** Uma pasta `Produtos` fez as 15 imagens
  darem 404 enquanto a listagem do painel dizia que estava tudo certo. A
  listagem não diferencia maiúscula, o endereço público diferencia. **Conferir
  abrindo o endereço, nunca pela listagem.**
* **Cache de 1 hora.** Toda imagem do Storage vai com `max-age=3600`. Trocar um
  arquivo não muda o que aparece na hora — a foto velha pode continuar por até
  uma hora. Não é erro.
* **Nome repetido no upload.** O painel do Supabase costuma **recusar** um
  arquivo com nome que já existe, em vez de substituir. Apagar antes de subir.
* **`convert` nesta máquina não é o ImageMagick.** É o
  `C:\WINDOWS\system32\convert`, que converte sistema de arquivos. **Nunca
  chamar.** Para mexer em imagem, Node com `sharp`.
* **`python` e `python3` não rodam** aqui: são atalhos da Loja da Microsoft.
* **Apagar produto não estraga pedido antigo.** `pedido_itens.produto_id` é
  `on delete set null` e o pedido guarda `nome_snap` e `preco_snap` (REGRA 3).
  Isso foi conferido antes de apagar o cardápio de teste, não presumido.
* **`seed_teste_dev.sql` não pode rodar duas vezes.** Os ids são fixos: a segunda
  vez dá erro de chave duplicada. E não rodar em produção com cardápio real no ar.

---

## 7. Como testar sem publicar

```
cd app
npm run dev:rede
```

Abre o totem no seu computador em `http://localhost:5173/adoravelburguer` e
também no tablet ou celular pelo endereço `http://<ip-da-maquina>:5173/...` que
o próprio comando mostra — tem que estar no mesmo wi-fi.

Esse endereço é temporário: existe enquanto o comando está rodando e some quando
você fecha. É de propósito. **Olhar aqui antes de qualquer coisa ir para o ar.**
