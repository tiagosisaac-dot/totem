# Totem de Autoatendimento — Contexto do Projeto

## Sobre quem está construindo

Isaac não tem formação em programação. Trabalha com contratos administrativos
no setor público e aprendeu a construir sistemas conversando com o Claude.

**Como trabalhar com ele:**

* Explique o que você vai fazer ANTES de fazer, em português simples
* Nada de jargão sem tradução na primeira vez que aparecer
* Um passo por vez; não entregue 5 arquivos de uma vez
* Quando der erro, explique a CAUSA, não só a correção
* Ele consegue seguir instrução de terminal, mas precisa do comando exato

\---

## O que é o produto

Sistema de totem de autoatendimento para lanchonetes e hamburguerias pequenas.
O cliente final faz o pedido num tablet no salão; o pedido cai na cozinha.

**Modelo de negócio: SaaS multi-tenant.** Isaac cobra mensalidade dos donos de
estabelecimento. Um único deploy atende todos os clientes. Por isso:

> \*\*REGRA 1 — Nada de dado de estabelecimento no código.\*\*
> Logo, cores, cardápio, preços: tudo vem do banco, sempre filtrado por
> `estabelecimento\_id`. Se você está prestes a escrever o nome de uma loja
> num arquivo `.tsx`, pare.

O primeiro cliente é um piloto real, com garçom levando o pedido à mesa.

\---

## Stack decidida

|Camada|Escolha|Motivo|
|-|-|-|
|Frontend|React (Vite) + Tailwind, PWA|Isaac já usou React|
|Banco / Auth / Storage|Supabase|tudo integrado, RLS, realtime|
|Backend|Supabase Edge Functions|onde o preço é recalculado|
|Hospedagem|Vercel|deploy simples|
|Dispositivo|Tablet **Android** em modo quiosque|maquininha só integra em Android|

**Não é app nativo.** É web app rodando em tela cheia. Um código só serve o
totem, a tela de impressão da cozinha e o painel do dono.

\---

## Regras invioláveis

> \*\*REGRA 2 — O total NUNCA é calculado no navegador.\*\*
> O totem manda os itens escolhidos; a Edge Function busca os preços no banco,
> recalcula e grava. Se o front mandar um campo `total`, ignore.
> Sem isso, qualquer pessoa no wi-fi da loja manda pedido de R$ 0,00.

> \*\*REGRA 3 — Pedido guarda cópia (snapshot) de nome e preço.\*\*
> `pedido\_itens.nome\_snap` e `preco\_snap`. Nunca faça JOIN com `produtos` para
> exibir histórico. Se o dono mudar o preço amanhã, a venda de ontem não pode
> mudar junto.

> \*\*REGRA 4 — Datas no fuso do estabelecimento, não em UTC.\*\*
> `(now() at time zone fuso)::date`. Em UTC, "hoje" vira "amanhã" às 21h —
> no meio do movimento da hamburgueria. Hoje isso decide quando a senha
> sequencial (`proxima\_senha`) zera, e vai decidir todo relatório por dia.

> \*\*REGRA 5 — Imagem é redimensionada no navegador antes do upload.\*\*
> Máx. 800px, convertida para WebP (\~60 KB). Foto de celular tem 4 MB;
> 40 delas travam o tablet no wi-fi da loja.

> REGRA 6 — RLS liga sozinho; as policies não.\*\*

> O projeto tem gatilho automático de RLS em toda tabela nova do schema

> public. Isso protege, mas também BLOQUEIA TUDO até existir policy.

> Se uma consulta voltar vazia sem erro aparente, a primeira suspeita é

> policy faltando — não bug de código.

> Toda tabela nova sai da migration com suas policies escritas.

\---

## ESTADO ATUAL — Fase 1 no ar em desenvolvimento

Banco criado e populado, isolamento entre estabelecimentos testado na prática,
projeto React rodando, Edge Function publicada. **Não recomece o setup.**

Pronto e testado:

* **Totem** (`/:slug`) — cardápio, opções, combos, carrinho, nome do cliente +
comer aqui/para levar, confirmação, envio, limpeza por inatividade
* **Edge Function `criar-pedido`** — publicada; recusa fraude de total e item
esgotado
* **Painel do dono** (`/:slug/admin`) — esgotar/reativar e mudar preço

**Em andamento (29/08/2026), ainda sem teste na loja:**

* **Impressão** (`/:slug/impressora`) — sem tela de cozinha nem de balcão para
o Adorável Burguer: o pedido sai IMPRESSO na Bematech i9 (a mesma do Anota Aí),
via QZ Tray (ponte local, roda no computador da loja ligado por USB na
impressora). Ver "Impressão do pedido" mais abaixo — falta o Isaac instalar o
QZ Tray e testar na impressora física.
* **Cozinha e Balcão foram REMOVIDOS do código** (`/:slug/cozinha`,
`/:slug/balcao` não existem mais) — decisão de 29/08/2026, junto com a saída da
mesa/plaquinha do fluxo.

**Migrations rodam à mão.** Os arquivos `supabase/migracao\_00N\_*.sql` são colados
por Isaac no SQL Editor do painel; não usamos `supabase db push`. Ao criar uma
migration nova: escrever o arquivo, pedir para ele rodar, **e só publicar Edge
Function que dependa dela depois** — senão o totem quebra no intervalo.
Já rodadas: 002 (plaquinha), 003 (devolução), 004 (cardápio ao vivo),
005 (só dono edita cardápio — confirmado em 15/08/2026 conferindo `pg_policies`),
006 (heartbeat), 007 (coluna `depende_da_opcao_id`, grupo de opção condicional
do combo — confirmada em 27/08/2026, junto com a republicação da Edge Function
`criar-pedido` e o `combo_transformar_burger.sql`).
008 (nome do cliente + tipo de consumo + impressão, tira mesa/plaquinha do
fluxo — rodada em 31/08/2026, colunas conferidas: `nome_cliente`/`tipo_consumo`
`not null`, `senha`/`impresso_em` nullable).

**Cardápio de teste: APAGADO em 20/08/2026.** Os ids que começavam com
`00000000-0000-4000-8000-` eram falsos (`supabase/seed\_teste\_dev.sql`) e saíram
com o comando que estava no fim daquele arquivo. As 40 mesas são reais e ficaram.
Apagar produto não apaga pedido antigo: `pedido\_itens.produto\_id` é
`on delete set null` e o pedido guarda `nome\_snap`/`preco\_snap` (REGRA 3).

**Cardápio real:** os 15 hambúrgueres entraram em 15/08/2026
(`supabase/cardapio\_adoravelburguer.sql`, conferido pela API pública).
Categoria `a1e7d3c4-5b62-4f18-9a03-7c2e8d1b4f60`. Junto veio o grupo
"Turbine seu burger" (blend extra +R$ 9,50), ligado aos 15 de uma vez — é o
mecanismo de grupo reutilizável, mudar o preço amanhã é uma linha só.
**Combo, bebidas, batata frita e milkshake: prontos e funcionando (27/08/2026).**
O combo é escolha condicional, não produto: marcar "Transformar em combo" libera
(e passa a exigir) o grupo "Bebida do combo" — sem a opção marcada, não dá pra
escolher a bebida e pagar errado. Mecanismo é a migração 007 (coluna
`depende_da_opcao_id`) + lógica nova em `Produto.jsx` e na Edge Function
`criar-pedido`. Batata frita (5) e milkshake (5 sabores) entraram por foto do
impresso, ainda sem foto própria no totem.

\---

## Acessos e ambientes

**Supabase (dev):** projeto `mpcrwhaqrismnhblgvij` →
`https://mpcrwhaqrismnhblgvij.supabase.co`. A chave `anon` fica em
`app/.env.local` (fora do controle de versão) e no painel da Vercel.
A `service\_role` só existe dentro da Edge Function — nunca no frontend.

**Estabelecimento piloto:** Adorável Burguer, slug `adoravelburguer`,
id `0d8ce944-a60e-469f-8dd5-622595fcab88`.

**Avisos de sistema (heartbeat):** bot do Telegram `@Totem\_alerta\_bot`, avisa o
Isaac. O token e o chat id vivem como **segredos da Edge Function** (`supabase
secrets set`), nunca no repositório. Trocar para WhatsApp um dia = reescrever só
`supabase/functions/\_shared/telegram.ts`; quem chama não muda.
**Decisão (28/08/2026): manter Telegram por enquanto.** WhatsApp não tem
equivalente simples e gratuito a um bot do Telegram — precisaria da API oficial
da Meta (cadastro de empresa + modelo de mensagem pré-aprovado) ou de um serviço
não-oficial tipo CallMeBot (simples, mas pode parar de funcionar sem aviso).
Reavaliar se o Isaac parar de checar o Telegram no dia a dia.

**Logins da equipe (ambiente dev).** As senhas são só do Isaac; não estão aqui e
não devem estar:

|Usuário|Papel|Acessa|
|-|-|-|
|`cozinha@adoravelburguer.com.br`|`cozinha`|`/impressora`|
|`dono@adoravelburguer.com.br`|`dono`|`/admin`|

> \*\*O Claude não consegue testar tela com login.\*\* Ele não tem as senhas, de
> propósito. Em tudo que exige login: verificar o que der sem entrar (compila,
> a tela de login aparece, a lógica está correta), e entregar ao Isaac um roteiro
> de teste explícito, dizendo **o que não foi verificado**. Não afirmar que
> funciona sem ter visto funcionando.

\---

## Estrutura do banco

**Tabelas:**

* `estabelecimentos` — tenants. Tem `ativo`, `bloqueado` (inadimplência),
`aceita\_pedidos` (dono pausa o totem), `fuso`, `config` jsonb
* `perfis` — liga `auth.users` a um estabelecimento. Papéis:
`superadmin` (Isaac), `dono`, `cozinha`
* `mesas` — **SEM USO** desde 29/08/2026. Era a lista de plaquinhas válidas;
o modelo atual não usa mesa nem plaquinha. Ficou na tabela por segurança
* `categorias`, `produtos` — cardápio. `produtos.disponivel` = botão "esgotou"
* `grupos\_opcoes` + `opcoes` + `produto\_grupos` — personalização **reutilizável**.
Tipos: `adicional` (soma preço), `remocao` (sem cebola), `escolha` (ponto da carne).
Um grupo serve vários produtos: mudar o preço do bacon = editar 1 linha
* `combo\_slots` + `combo\_slot\_produtos` — combo é produto que contém produtos.
Mecanismo diferente de adicional, não confunda
* `pedidos`, `pedido\_itens`, `pedido\_item\_opcoes` — com snapshots.
`pedidos.nome\_cliente` (digitado no totem) e `pedidos.tipo\_consumo`
(`local`/`levar`) são a identificação do pedido — sem mesa.
`pedidos.impresso\_em` marca quando o cupom saiu na cozinha (nulo = falta
imprimir). `pedidos.pago` (bool), `.forma\_pagamento` (`'pix'` fixo, hoje —
sem caixa) e `.pago\_em` controlam o pagamento por Pix (desde 01/09/2026,
ver "Pagamento por Pix" acima); `.pagamento\_externo\_id` liga o pedido ao
pagamento no Mercado Pago, usado pelo webhook. `pedidos.mesa\_numero` e
`pedidos.alerta\_reuso\_em` **SEM USO** desde 29/08/2026 (eram do modelo de
plaquinha)
* `contadores\_senha` + `proxima\_senha(uuid)` — **voltou a ter uso em
29/08/2026.** `pedidos.senha` é preenchido a cada pedido do totem, mas é só
contagem interna do dia — não aparece grande em tela nem no cupom

**Funções auxiliares de RLS:** `meu\_estabelecimento()`, `sou\_superadmin()`

**Storage:** bucket público `cardapio`, estrutura
`cardapio/<estabelecimento\_id>/produtos/<produto\_id>.webp`.
Leitura pública (é cardápio, não é sigiloso). Escrita só na própria pasta.
O dono NUNCA recebe credencial do bucket — sobe pelo painel, o backend
decide o caminho a partir do token dele.

**Realtime ligado** em `pedidos` e `pedido\_itens` (para a tela de impressão).

**`totem\_heartbeat`** — uma linha por estabelecimento, com `ultimo\_ping` e
`alertado\_em`. O totem manda sinal a cada minuto (`useHeartbeat` →
Edge Function `ping`); `verificar-heartbeat` roda pelo `pg\_cron` e avisa o
Isaac no Telegram quando passa de 3 minutos sem sinal. `alertado\_em` impede
repetir o mesmo aviso; o `ping` zera o campo e manda o aviso de volta.
Só alerta estabelecimento `ativo` e com `aceita\_pedidos` — dono que pausou o
totem de propósito não é queda.

\---

## Impressão do pedido (QZ Tray) — 31/08/2026, testada em casa (Microsoft
## Print to PDF), ainda não testada com a i9 física na loja

O Adorável Burguer não usa tela de cozinha nem plaquinha: o pedido do totem sai
**impresso na Bematech i9**, a mesma impressora onde já saem os pedidos do
Anota Aí. Como a i9 está ligada por **USB num computador** da loja (não em
rede), o navegador sozinho não alcança — precisa de uma ponte local.

**Ponte escolhida: QZ Tray.** Programa grátis, instala uma vez no computador da
loja. Depois disso, basta deixar uma aba do navegador aberta em
`/:slug/impressora` **naquele computador** (login com `cozinha@...`, mesmo
usuário de sempre) — ela conecta no QZ Tray sozinha.

**Impressão NÃO é automática (mudou em 31/08/2026)** — pedido novo chega na
tela como "Aguardando pagamento no caixa" (botão vermelho "Imprimir"), não
imprime sozinho. Motivo: o pagamento é no caixa, depois do totem (item 5 da
Fase 1) — se imprimisse na hora do pedido, cliente que desiste antes de pagar
já teria comida em produção na cozinha. Alguém (caixa ou cozinha) só aperta
"Imprimir" depois que o cliente pagou. Depois de impresso, o botão vira verde
e o texto "Reimprimir" — continua ali pra reimprimir se o papel emperrar
(nunca falha silenciosa).

* `estabelecimentos.config.impressora\_nome` (jsonb, sem migração nova) guarda
o nome EXATO que o Windows dá à impressora depois de instalado o QZ Tray —
REGRA 1, nada fixo no código. Ver `supabase/configura\_impressora\_adoravelburguer.sql`.
* `pedidos.impresso\_em` evita reimprimir sozinho o mesmo pedido; a tela tem
botão **"Reimprimir"** em cada linha, porque papel emperra e acaba — nunca
falha silenciosa.
* Cupom em ESC/POS cru (`app/src/lib/cupom.js`): cabeçalho "PEDIDO TOTEM",
nome do cliente em destaque, "COMER AQUI"/"PARA LEVAR", itens, total. A senha
sai pequena, só referência — não é o destaque (decisão do Isaac).
* **Certificado do QZ Tray, por estabelecimento (`app/src/lib/qzTray.js` +
`estabelecimentos.config.qz_certificado`/`qz_chave_privada`, testado e
funcionando em 31/08/2026).** Sem certificado, toda conexão aparece pro QZ
Tray como "anônima" — e conexão anônima NUNCA deixa marcar "Remember this
decision" (o QZ Tray desabilita o botão Allow quando a caixinha é marcada),
então pedia autorização manual a cada impressão. A correção: cada
estabelecimento tem um par certificado+chave RSA próprio (gerado com openssl,
`basicConstraints=CA:FALSE` + `keyUsage=digitalSignature,keyEncipherment` —
sem esses dois o QZ Tray classifica como "Invalid Certificate"), guardado só
no banco (REGRA 1, nunca versionado). `Impressora.jsx` busca do
`estabelecimentos.config` e assina cada requisição com `jsrsasign`
(`qzTray.js`) antes de conectar.
  * **Cadastro de cliente novo:** gerar o par com openssl (comandos no
  histórico desta sessão), rodar um UPDATE avulso em `estabelecimentos.config`
  (nunca commitar a chave privada — gerar, colar num arquivo temporário local,
  pedir pra rodar, apagar o arquivo depois, igual já se faz com os `.reg`).
  * **Ainda assim, o "Remember this decision" da janela pop-up tem um bug
  visual no QZ Tray 2.2.6** (marcar a caixinha desabilita o Allow, mesmo com
  certificado válido — não é resolvido só com certificado). **O que resolve de
  verdade:** no ícone do QZ Tray (perto do relógio) → botão direito →
  "Advanced" → aba **"Sites"/"Site Manager"** → **"+"** → **"Browse..."** →
  seleciona um arquivo `.txt` com o certificado público (só o `CERTIFICATE`,
  nunca a chave privada) → aceita "copiar para `override.crt`" quando
  perguntar. Isso instala como confiança permanente no QZ Tray daquele
  computador, sem depender do checkbox com bug. **Precisa repetir em cada
  computador novo** que for abrir `/impressora` (o computador da loja
  incluído) — dar o arquivo `.txt` do certificado (não a chave) pra fazer esse
  Browse lá.
* **Permissão "Apps no dispositivo" do Chrome (descoberto em 31/08/2026,
testando em `localhost` vs. no site publicado).** Chrome recente bloqueia por
padrão qualquer site publicado (https, fora do próprio computador) de acessar
coisas no `localhost` — é o que o QZ Tray usa pra conversar com o navegador.
Sem isso, a tela fica presa em "QZ Tray não encontrado", mesmo com o QZ Tray
rodando certinho (em `localhost:5173` conecta liso, porque local-com-local não
é bloqueado — foi assim que descobrimos a causa). **Não tem flag nem política
de registro que resolva isso** (tentamos `chrome://flags` e a política
`InsecurePrivateNetworkRequestsAllowedForUrls` — as duas não existem mais nessa
versão do Chrome). O que resolve: clicar no cadeado/ícone ao lado do endereço
do site → **"Apps no dispositivo"** → trocar de "Bloquear" para "Permitir". É
por site E por computador/navegador — **precisa repetir esse passo em toda
máquina nova** que abrir `/impressora` (inclusive no(s) computador(es) da
loja). Fica registrado no Chrome depois de feito uma vez, não precisa repetir
a cada pedido nem a cada abertura da aba.
* **Testado em 31/08/2026, funcionando de ponta a ponta com uma impressora
virtual (Microsoft Print to PDF)**: totem → banco → tela `/impressora` →
QZ Tray → impressão automática, sem clique manual, `impresso_em` grava certo.
Confirma que só falta a parte física.
* **O que falta**: Isaac instalar o QZ Tray no computador da loja (repetir
"Apps no dispositivo" no Chrome + o passo do Site Manager/`override.crt`
acima, com o certificado do Adorável Burguer), configurar a i9, rodar o SQL do
nome da impressora, e testar um pedido de verdade na impressora física. O
formato do cupom é ponto de partida razoável (i9 aceita ESC/POS, mas só foi
validado contra uma impressora virtual até aqui — nunca testou o ESC/POS cru
saindo em papel de verdade), esperado precisar de 1-2 ajustes vendo o papel
sair.

\---

## Pagamento por Pix (Mercado Pago) — 01/09/2026, testado de ponta a ponta
## com dinheiro real (conta pessoal do Isaac); falta trocar pela conta do
## Adorável Burguer

Totem só aceita Pix (decisão do Isaac, ver "Fluxo do totem" acima). QR code
dinâmico (valor exato, uso único), confirmação automática por webhook — nunca
por botão de "eu paguei".

**Por que cada estabelecimento tem a própria conta Mercado Pago, nunca uma
conta do Isaac:** o dinheiro precisa cair direto na conta do cliente. Um
sistema que centraliza o dinheiro numa conta e repassa pra cada loja é um
"split de pagamento" — virou obrigatório por regulação do Banco Central pra
marketplaces/fintechs em 2026, responsabilidade que este projeto não precisa
assumir. Cada estabelecimento cria a própria conta e a própria Aplicação no
painel de Developers do Mercado Pago; o totem só usa o token de cada um.

* `estabelecimentos.config.mercado_pago_access_token` e
`.mercado_pago_webhook_secret` (jsonb, sem migração nova — REGRA 1) guardam as
credenciais de cada loja. Nunca versionadas: SQL avulso gerado na hora, Isaac
roda, arquivo apagado depois (mesmo padrão do certificado do QZ Tray).
* Migração `supabase/migracao_009_pagamento_pix.sql` — **já rodada** em
01/09/2026 — adiciona `pedidos.pago_em` e `pedidos.pagamento_externo_id`.
`pedidos.pago`, `.forma_pagamento` e `.status` já existiam no schema original,
sem uso até agora.
* Três Edge Functions novas: `criar-cobranca-pix` (gera o QR, chamada pelo
totem depois de `criar-pedido`), `consultar-pagamento-pix` (o totem consulta
em loop, só devolve `{pago: boolean}` — não abre RLS de `select` pra `anon`
em `pedidos`, que vazaria pedido de todo mundo pra qualquer aparelho),
`webhook-mercadopago` (recebe a notificação do Mercado Pago, publicada com
`--no-verify-jwt` — é a única função do projeto que aceita chamada anônima de
fora do sistema). `supabase/functions/_shared/mercadopago.ts` é o único lugar
que fala REST com a API do Mercado Pago, mesmo padrão do `_shared/telegram.ts`.
* O webhook **nunca confia no corpo da notificação pra saber se pagou**: valida
a assinatura (`x-signature`, HMAC-SHA256) e sempre confere de volta na API do
Mercado Pago (`GET /v1/payments/{id}`) antes de marcar `pago = true`. Também
confere que o valor pago bate com `pedidos.total` (REGRA 2 por outro caminho).
* **Testado de ponta a ponta com dinheiro real em 01/09/2026** (R$ 1,00, item
com preço temporariamente ajustado no painel do dono): totem → QR code →
Pix pago pelo celular do Isaac → webhook confirma → tela do totem avança
sozinha → pedido aparece pago em `/impressora`. Confirma que a arquitetura
funciona ponta a ponta — só não imprimiu porque o QZ Tray não estava
rodando no computador usado no teste (pendência separada, ver "Impressão do
pedido").
* **Detalhes confirmados nesse teste** (os pontos que o plano original deixou
como "verificar depois"): `payer.email` É obrigatório no `POST /v1/payments`
mesmo sem cliente cadastrado, mas recusa domínio `.invalid` — o código manda
`pedido-<uuid>@example.com`, que passa. `notification_url` por requisição
(mandado dentro do corpo de cada `POST /v1/payments`) É respeitado — o
Mercado Pago manda a notificação pra lá, mesmo com uma URL diferente
configurada no painel da Aplicação (a assinatura secreta, porém, é uma só
por Aplicação, não muda entre "Modo de teste"/"Modo de produção").
* **Bug corrigido nesse teste**: o nome real da coluna no banco é
`pedidos.pagamento_externo_id` (não `pix_pagamento_id` — uma versão anterior
do plano usou esse nome e chegou a ser rodada por engano; o código foi
ajustado pra usar o nome real, sem precisar renomear a coluna de novo).
* **Credenciais atuais no Adorável Burguer são as do Isaac (conta pessoal
dele no Mercado Pago), não do dono do estabelecimento** — usadas só pra
confirmar que o fluxo funciona com dinheiro real antes de envolver o
cliente. **Ainda falta**: trocar pelas credenciais de produção da conta do
próprio Adorável Burguer quando o piloto for pra loja de verdade.

\---

## Fase 1 — escopo fechado

Não construa nada fora desta lista. O piloto precisa ir ao ar.

1. **Totem** (`/:slug`) — categorias → produto → personalização → carrinho
→ comer aqui/para levar + nome do cliente → **Pix** → confirma
2. **Edge Function `criar-pedido`** — valida, recalcula total ✅ *pronta*
3. **Pagamento por Pix** (Mercado Pago) — QR code dinâmico, confirmação
automática via webhook, sem botão de "eu paguei" (ver "Pagamento por Pix"
abaixo)
4. **Impressão** (`/:slug/impressora`) — pedido sai impresso na cozinha via QZ
Tray, sozinho assim que o Pix confirma (sem tela de cozinha nem plaquinha, ver
seção "Impressão do pedido" acima)
5. **Painel do dono** (`/:slug/admin`) — esgotar/reativar item, mudar preço

**Fora de escopo agora:** maquininha de cartão, relatórios, NFC-e, cadastro de
cardápio pelo dono (Isaac cadastra no onboarding). **"Pagar no caixa" saiu do
totem em 01/09/2026** — decisão do Isaac, o totem só aceita Pix agora (sem
fallback pra caixa; risco assumido conscientemente: cliente sem Pix não
consegue pedir pelo totem).

\---

## Fluxo do totem (01/09/2026: sem mesa, pagamento por Pix, impressão automática)

**Não há plaquinha nem número de mesa.** Na última tela, o cliente escolhe
**comer no local ou levar** e digita o **próprio nome** — é isso que sai no
cupom impresso na cozinha e que a equipe usa pra identificar o pedido.
O pedido ganha uma senha sequencial do dia só para contagem interna (não
aparece grande em lugar nenhum).

1. Tela inicial com a logo → "Toque para pedir"
2. Categorias → produtos com foto e preço
3. Produto → grupos de opções (obrigatórios primeiro) → adicionar
4. Carrinho → revisar
5. **Comer aqui/para levar + nome**, teclado nativo do Android → **confirmar**
6. **QR code Pix** — "Escaneie para pagar", fica consultando sozinho até
confirmar (nunca por clique de "eu paguei")
7. "Pagamento confirmado! [Nome]. Seu pedido já foi pra cozinha."
8. Volta sozinho para a tela inicial após 5s

Se o cliente não pagar em alguns minutos, a tela avisa "ainda não recebemos
seu pagamento" mas continua esperando (nunca some sozinha) — QR code continua
válido, cliente pode terminar de pagar a qualquer momento enquanto estiver ali.
Se a geração do Pix falhar (loja sem token configurado, Mercado Pago fora do
ar), mostra erro com botão "Tentar novamente" — o pedido já foi criado no
banco, não perde o lugar na fila só porque o Pix falhou momentaneamente.

**Uma linha do carrinho = uma configuração com uma quantidade.** As opções
escolhidas valem para a linha inteira: 3 hambúrgueres com blend extra são 3 com
blend, não 1 com e 2 sem. Quem quer um diferente adiciona de novo, e vira outra
linha. Para isso não pegar o cliente de surpresa, a tela do produto avisa quando
a quantidade passa de 1, e cada linha do carrinho tem **−** e **+** — dá para
tirar um dos dois sem apagar a linha e refazer o pedido. O **−** para no 1; quem
remove é o **×**, porque chegar a zero apagaria o item com o mesmo toque que
estava diminuindo. O item guarda `unitarioMostrado` (o preço de UM, já com as
opções) só para o carrinho poder refazer a conta da linha.

Decidido em 26/08/2026, contra travar a quantidade em 1 ao personalizar e contra
perguntar item por item — as duas custam mais toques, com fila esperando atrás.

**Design:** alvos de toque grandes (mínimo 60px), fonte grande, contraste alto.
É usado em pé, com pressa, por gente de todas as idades. Nada de menu enxuto
tipo desktop.

\---

## Riscos operacionais a tratar no código

* **Queda de internet** — estado de erro claro, nunca aceitar pedido e perder
* **Cliente desiste no meio** — timeout de inatividade limpa o carrinho
* **Nome digitado errado** — confirmação explícita antes de enviar. Risco bem
menor do que "mesa errada" era: nome trocado não manda comida pra estranho,
só obriga a equipe a perguntar de novo no balcão
* **Impressão falha** (papel emperrou/acabou) — nunca falha silenciosa: a tela
`/impressora` mostra o pedido pago e tem botão "Imprimir"/"Reimprimir" (nunca
some, mas só aparece depois de `pago = true`)
* **Cliente desiste de pagar** — pedido não pago não pode ser impresso nem
manualmente na tela `/impressora` (o botão nem aparece) — impressão só
dispara sozinha quando o webhook do Mercado Pago confirma o pagamento (ver
"Pagamento por Pix" abaixo)
* **Totem caiu** — heartbeat, Isaac precisa saber antes do dono ligar

\---

## Convenções

* Código, comentários e interface em **português**
* Dois ambientes Supabase: `dev` e `prod`. Nunca mexer direto em produção
* Commit pequeno e frequente, mensagem em português
* Sem `service\_role key` no frontend, jamais. Só em Edge Function
* **Rodar o projeto** (a partir da raiz do repositório, não da pasta pessoal):
`npm --prefix app run dev` → `http://localhost:5173/adoravelburguer`
* **Ver no tablet sem publicar:** `npm --prefix app run dev:rede` abre o servidor
para os outros aparelhos do mesmo wi-fi → `http://<ip-da-máquina>:5173/adoravelburguer`.
Layout de quiosque só revela o que está errado no aparelho de verdade.
Só funciona com os dois na mesma rede — se o Isaac estiver fora de casa, não serve
* **Repositório:** `github.com/tiagosisaac-dot/totem` (privado), branch `master`
* **Produção:** `https://totem-vert.vercel.app/adoravelburguer`.
**Deploy é automático:** todo `git push` para `master` publica. Não existe comando
de deploy — o que sobe é o que está no GitHub
* **As chaves do Supabase em produção vivem no painel da Vercel**, não no
repositório. `app/.env.local` é só da máquina do Isaac. Na Vercel o projeto tem
**Root Directory = `app`** (sem isso o build falha sem explicar a causa) e
`app/vercel.json` reescreve as rotas — sem ele, abrir `/:slug/impressora` direto
daria "página não encontrada"
* **Publicar Edge Function:** `npx --yes supabase@latest functions deploy <nome>
--project-ref mpcrwhaqrismnhblgvij`. Não precisa de `supabase link` nem de Docker
(o aviso de Docker no deploy é irrelevante)
* **`npm audit` acusa falha alta no `react-router`** — é no modo RSC, que roda
roteamento no servidor. O totem é 100% navegador, esse código nem carrega. Não
existe versão corrigida; a única "correção" oferecida é voltar para uma versão
antiga. Não voltar. Reavaliar quando sair release com o patch

\---

## Próximo passo

**Pix já funciona de ponta a ponta, testado com dinheiro real em
01/09/2026** (ver "Pagamento por Pix" acima). Falta só:

1. ~~Migração 009~~ — **feito** (01/09/2026)
2. ~~Edge Functions, ajuste em `criar-pedido`, frontend do totem e da
`/impressora`~~ — **feito e publicado** (01/09/2026)
3. ~~Testar com credenciais de teste, depois com Pix real (R$1,00)~~ —
**feito** (01/09/2026, usando a conta pessoal do Isaac no Mercado Pago —
ver nota na seção "Pagamento por Pix")
4. **Trocar as credenciais pela conta real do Adorável Burguer** quando o
piloto for pra loja de verdade — mesmo passo de SQL avulso, só com token e
segredo de webhook da conta do próprio estabelecimento

**Prioridade agora: colocar a impressão física no ar** (o Pix já empurra o
pedido pra `/impressora` automaticamente assim que confirma — só falta a
Bematech i9 física respondendo). Nesta ordem (ver seção "Impressão do
pedido" acima):

1. ~~Isaac roda `migracao_008_senha_e_impressao.sql` no SQL Editor~~ — **feito**
(31/08/2026)
2. ~~`git push`~~ — **feito** (31/08/2026, commit `ebe8223`): totem sem mesa,
cozinha/balcão removidas, tela `/impressora` nova, no ar na Vercel
3. ~~Republicar a Edge Function `criar-pedido`~~ — **feito** (31/08/2026)
4. **Isaac decidiu (31/08/2026): mantém QZ Tray**, mesmo com o totem podendo
rodar num PC com tela touch em vez de tablet Android. Totem e `/impressora`
não se falam direto — só pelo banco — então funciona tanto num PC só (totem +
aba `/impressora` na mesma máquina) quanto em dois PCs separados (QZ Tray só
precisa estar na máquina ligada por USB na i9). **Falta**: instalar o QZ Tray
no computador da loja, configurar a i9, rodar
`supabase/configura\_impressora\_adoravelburguer.sql` com o nome exato da
impressora
5. Abrir `/adoravelburguer/impressora` nesse computador, logar, aceitar o QZ
Tray, testar um pedido de verdade e ajustar o cupom (`app/src/lib/cupom.js`)
conforme o que sair no papel

Depois disso, a fila antiga da Fase 1 (todos já feitos):

1. ~~Restringir alteração de preço ao dono~~ — **feito** (migração 005, confirmada
15/08/2026: só `dono` tem policy de insert/update/delete em produtos, categorias,
grupos\_opcoes e opcoes; leitura continua pública)
2. **Cardápio real do Adorável Burguer** — hambúrgueres **feitos** (15/08/2026),
cardápio de teste **apagado** e as **15 fotos no ar** (20/08/2026, conferidas
byte a byte pela API pública). Bebidas, combo, batata frita e milkshake
**feitos e funcionando** (27/08/2026). Batata e milkshake ficam sem foto por
decisão do Isaac (28/08/2026), não é pendência
3. ~~Deploy na Vercel~~ — **feito**, no ar em `totem-vert.vercel.app/adoravelburguer`
4. ~~Heartbeat~~ — **feito** (migração 006 + Edge Functions `ping` e
`verificar-heartbeat`, testadas de ponta a ponta em 15/08/2026).
**A conferência está PAUSADA** (`cron.unschedule`): sem tablet ligado o dia
todo, "sem sinal" é o estado normal e o aviso vira ruído. **Religar junto com
o piloto** — o comando está no fim de `migracao_006_heartbeat_totem.sql`
5. Preencher os **A DEFINIR** do `docs/PRD.md`: mensalidade, quem paga o tablet,
critério de sucesso do piloto, e como o dono chama o suporte no meio do movimento

**Princípio que apareceu várias vezes e vale repetir:** ação que mexe no dinheiro
ou no pedido do cliente é sempre explícita, nunca silenciosa. Confirmação do
nome antes de enviar, botão "Alterar preço", item esgotado que fica marcado em
vez de sumir do carrinho, botão "Reimprimir" em vez de reimprimir sozinho sem
avisar — é a mesma regra em todos os casos.

