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
totem, o KDS da cozinha, o painel do dono e o painel de chamada de senha.

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
> no meio do movimento da hamburgueria. Hoje isso decide se um número de
> plaquinha ainda está bloqueado, e vai decidir todo relatório por dia.

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

## ⚠️ ESTADO ATUAL: PROJETO ZERADO

**Nada foi executado ainda.** Não existe projeto Supabase populado, não existe
projeto React, não existe nenhuma tabela. Os arquivos `.sql` na pasta
`supabase/` foram escritos mas **nunca rodados**.

Antes de escrever qualquer código de aplicação, conduza Isaac por este setup,
**um item por vez**, confirmando cada um antes de seguir:

1. Conta no Supabase criada e projeto novo criado (ele faz no navegador)
2. `supabase/schema\_totem\_v1.sql` colado no SQL Editor e executado
3. Bucket `cardapio` criado pelo painel, marcado como **público**
4. `supabase/storage\_policies.sql` executado
5. Teste de isolamento do bucket (está descrito no fim daquele arquivo) — não pule
6. Node.js LTS instalado (o Claude Code não precisa, mas o projeto React precisa)
7. Projeto React criado com Vite + Tailwind
8. `.env.local` com a URL e a chave `anon` do Supabase, e `.gitignore` cobrindo ele
9. Primeiro estabelecimento inserido à mão no banco, para ter o que testar

Só depois disso comece a Edge Function.

\---

## Estrutura do banco (a ser criada pelos .sql)

**Tabelas:**

* `estabelecimentos` — tenants. Tem `ativo`, `bloqueado` (inadimplência),
`aceita\_pedidos` (dono pausa o totem), `fuso`, `config` jsonb
* `perfis` — liga `auth.users` a um estabelecimento. Papéis:
`superadmin` (Isaac), `dono`, `cozinha`
* `mesas` — os números de plaquinha válidos. Serve para barrar erro de digitação
(mesa 99 numa loja com 40 plaquinhas)
* `categorias`, `produtos` — cardápio. `produtos.disponivel` = botão "esgotou"
* `grupos\_opcoes` + `opcoes` + `produto\_grupos` — personalização **reutilizável**.
Tipos: `adicional` (soma preço), `remocao` (sem cebola), `escolha` (ponto da carne).
Um grupo serve vários produtos: mudar o preço do bacon = editar 1 linha
* `combo\_slots` + `combo\_slot\_produtos` — combo é produto que contém produtos.
Mecanismo diferente de adicional, não confunda
* `pedidos`, `pedido\_itens`, `pedido\_item\_opcoes` — com snapshots.
`pedidos.mesa\_numero` = a plaquinha digitada, é a identificação do pedido.
`pedidos.alerta\_reuso\_em` = alguém tentou usar esse número enquanto o pedido
estava aberto; o KDS destaca para a equipe confirmar a entrega
* `contadores\_senha` + `proxima\_senha(uuid)` — **SEM USO.** Ficaram para o caso
de um cliente futuro preferir senha sequencial em vez de plaquinha. `pedidos.senha`
fica nulo

**Funções auxiliares de RLS:** `meu\_estabelecimento()`, `sou\_superadmin()`

**Storage:** bucket público `cardapio`, estrutura
`cardapio/<estabelecimento\_id>/produtos/<produto\_id>.webp`.
Leitura pública (é cardápio, não é sigiloso). Escrita só na própria pasta.
O dono NUNCA recebe credencial do bucket — sobe pelo painel, o backend
decide o caminho a partir do token dele.

**Realtime ligado** em `pedidos` e `pedido\_itens` (para o KDS).

\---

## Fase 1 — escopo fechado

Não construa nada fora desta lista. O piloto precisa ir ao ar.

1. **Totem** (`/:slug`) — categorias → produto → personalização → carrinho
→ digita o número da plaquinha → confirma
2. **Edge Function `criar-pedido`** — valida, recalcula total ✅ *pronta*
3. **KDS** (`/:slug/cozinha`) — pedidos em tempo real, número da mesa em destaque,
maior que o nome do produto. **A cozinha toca UMA vez ("Pronto")** — mão
engordurada não volta na tela. O garçom toca "Entregue" e depois "Devolvida"
(é a devolução que libera o número, não a entrega)
4. **Painel do dono** (`/:slug/admin`) — esgotar/reativar item, mudar preço
5. **Pagamento: no caixa.** O cliente fala o número da mesa no caixa

**Fora de escopo agora:** Pix, maquininha, relatórios, NFC-e, cadastro de
cardápio pelo dono (Isaac cadastra no onboarding).

\---

## Fluxo do totem (piloto: garçom leva na mesa)

**O número do pedido é uma plaquinha física** que fica ao lado do totem. O
cliente pega uma, deixa na mesa e digita o número **no fim** do pedido. O sistema
não gera número sequencial — assim as plaquinhas voltam para a pilha em qualquer
ordem e o dono não precisa organizar nada no fim do dia.

1. Tela inicial com a logo → "Toque para pedir"
2. Categorias → produtos com foto e preço
3. Produto → grupos de opções (obrigatórios primeiro) → adicionar
4. Carrinho → revisar
5. **Número da mesa**, teclado grande → **confirmar** ("Mesa 17, está certo?")
6. "Pedido enviado. Mesa 17. Pague no caixa."
7. Volta sozinho para a tela inicial após 15s

**Design:** alvos de toque grandes (mínimo 60px), fonte grande, contraste alto.
É usado em pé, com pressa, por gente de todas as idades. Nada de menu enxuto
tipo desktop.

\---

## Riscos operacionais a tratar no código

* **Queda de internet** — estado de erro claro, nunca aceitar pedido e perder
* **Cliente desiste no meio** — timeout de inatividade limpa o carrinho
* **Mesa errada** — confirmação explícita antes de enviar
* **Número de plaquinha repetido** — recusa o pedido, manda pegar outra plaquinha
e marca `alerta\_reuso\_em` no pedido antigo para o KDS destacar. O que bloqueia é
`plaquinha\_devolvida\_em` estar nulo, **não** o status: o prato é entregue e a
plaquinha continua na mesa. Só considera pedidos **de hoje**, senão os números vão
sumindo até o totem travar
* **Totem caiu** — heartbeat, Isaac precisa saber antes do dono ligar

\---

## Convenções

* Código, comentários e interface em **português**
* Dois ambientes Supabase: `dev` e `prod`. Nunca mexer direto em produção
* Commit pequeno e frequente, mensagem em português
* Sem `service\_role key` no frontend, jamais. Só em Edge Function
* **Rodar o projeto** (a partir da raiz do repositório, não da pasta pessoal):
`npm --prefix app run dev` → `http://localhost:5173/adoravelburguer`
* **Publicar Edge Function:** `npx --yes supabase@latest functions deploy <nome>
--project-ref mpcrwhaqrismnhblgvij`. Não precisa de `supabase link` nem de Docker
(o aviso de Docker no deploy é irrelevante)
* **`npm audit` acusa falha alta no `react-router`** — é no modo RSC, que roda
roteamento no servidor. O totem é 100% navegador, esse código nem carrega. Não
existe versão corrigida; a única "correção" oferecida é voltar para uma versão
antiga. Não voltar. Reavaliar quando sair release com o patch

\---

## Próximo passo

O setup listado lá em cima, item por item. **Nada de código de aplicação antes
do banco existir e o teste de isolamento passar.**

Depois: Edge Function `criar-pedido` (é a peça que garante a Regra 2),
e em seguida a tela do totem.

