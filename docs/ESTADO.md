# ESTADO — onde paramos

> **Atualizado em 26/08/2026.**
> Este arquivo é o retrato do projeto num dia. O `CLAUDE.md` explica **como** as
> coisas funcionam e **por quê**; aqui fica **até onde chegamos**. Quando os dois
> discordarem, o `CLAUDE.md` está certo — é ele que é mantido junto do código.

---

## Em uma frase

O totem está no ar, com o cardápio real de hambúrgueres e as 15 fotos, e o que
falta é o resto do impresso, o piloto de verdade na loja e as decisões de
negócio que ninguém tomou ainda.

---

## 1. O que já está no ar e funcionando

**Endereço:** `totem-vert.vercel.app/adoravelburguer`
A Vercel republica sozinha a cada `git push`. Não existe passo de deploy.

* **Fase 1 fechada.** Tela inicial → cardápio → produto → carrinho → número da
  mesa → confirmação, e volta sozinho ao início.
* **Cozinha e balcão** em lista, com cor avisando o pedido que atrasou.
* **Cardápio real** do Adorável Burguer: 1 categoria, 15 hambúrgueres, 1 grupo
  de opção ("Turbine seu burger"), 40 mesas.
* **Cardápio de teste apagado** em 20/08/2026. Não sobrou nada de teste no banco.
* **As 15 fotos** no Storage, ligadas aos produtos.
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

## 3. Feito mas NÃO publicado

Três commits fechados, parados na máquina do Isaac. **O que está no ar não tem
nada disso.**

| commit | o que é |
|--------|---------|
| `8111a1b` | registra a limpeza do cardápio de teste |
| `86ad2f0` | liga as 15 fotos e registra as decisões |
| `d29aeda` | **−** e **+** no carrinho, e o aviso do adicional |

Para publicar: `git push`. A Vercel faz o resto em um ou dois minutos.

O `d29aeda` conserta duas coisas que o Isaac achou testando: o **×** do carrinho
apagava a linha inteira (não dava para tirar 1 de 2 iguais), e o adicional
escolhido valia para todos os itens da linha sem avisar. Foi **testado no
navegador** com o cardápio real. O **envio do pedido não foi testado** — gravaria
pedido de verdade na cozinha.

---

## 4. O que falta para o piloto rodar

1. **Fotos das outras páginas do impresso** (bebidas, porções). Sem elas o resto
   do cardápio não entra, e sem o resto do cardápio o combo "+R$ 15" não tem como
   existir — ele precisa da bebida cadastrada.
2. **Religar a conferência do heartbeat.** Está pausada de propósito
   (`cron.unschedule`): sem tablet ligado o dia todo, "sem sinal" é o estado
   normal e o aviso vira ruído. O comando para religar está no fim de
   `supabase/migracao_006_heartbeat_totem.sql`. **Religar junto com o piloto.**
3. **Tela de upload de foto pelo dono.** Hoje quem sobe foto é o Isaac, pelo
   painel do Supabase. O dono nunca recebe credencial do bucket.
4. **Testar o pedido de ponta a ponta** com a mudança do carrinho: pedir 2
   iguais, tirar um, finalizar numa mesa, e conferir se a cozinha recebe 1 e se
   o valor bate.

---

## 5. Decisões pendentes

As de negócio estão marcadas **A DEFINIR** no `docs/PRD.md`. Não são detalhe:
são elas que decidem se o piloto vira produto ou fica sendo favor.

* **Mensalidade** — quanto custa por estabelecimento
* **Tablet** — do dono, alugado, ou incluído no preço
* **Plaquinhas de mesa** — quem produz e quanto custa
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
