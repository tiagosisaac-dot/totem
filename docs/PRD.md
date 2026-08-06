# PRD — Totem de Autoatendimento para Lanchonetes

> **Status:** rascunho v0.1 — 27/07/2026
> **Autor:** Isaac
> Itens marcados **A DEFINIR** são decisões que ainda não foram tomadas.
> Não preencher com chute: preencher quando houver dado.

---

## 1. Em uma frase

Sistema de autoatendimento que permite a uma lanchonete pequena atender mais
gente sem contratar mais gente, cobrado como mensalidade acessível.

---

## 2. O problema

O dono de lanchonete pequena tem um teto de atendimento definido pelo número de
funcionários que ele consegue pagar. Nos horários de pico, esse teto vira fila —
e fila vira cliente que desiste. Contratar mais uma pessoa é caro, e o custo é
fixo mesmo nos horários vazios.

Ao mesmo tempo, as soluções de autoatendimento que existem no mercado são
pensadas para rede grande: caras, com contrato longo, exigindo equipamento
próprio. Fora do alcance de quem tem uma loja só.

**A dor não é tecnológica, é de folha de pagamento.**

---

## 3. Proposta de valor

O totem absorve parte dos pedidos sem custo de pessoal, por um valor de
mensalidade que cabe no orçamento de uma loja pequena.

**Posicionamento honesto — o totem não substitui o caixa.** Parte dos clientes
prefere ser atendida por uma pessoa, e isso não vai mudar. O totem atende a
outra parte: quem tem pressa, quem prefere não interagir, quem está em fila. Os
dois canais funcionam em paralelo.

Isso é vantagem, não limitação: o dono não precisa demitir ninguém nem mudar a
operação para começar. Ele adiciona capacidade.

**Por que é mais barato que o mercado:** um único sistema atende todos os
clientes (multi-tenant), roda em tablet comum em vez de equipamento dedicado, e
o cliente não paga desenvolvimento — paga assinatura.

---

## 4. Quem usa

| Quem | O que faz | O que importa para essa pessoa |
|---|---|---|
| **Cliente final** | Faz o pedido no tablet | Ser rápido e óbvio. Está em pé, com pressa, pode ter 70 anos |
| **Dono / gerente** | Marca item esgotado, ajusta preço, pausa o totem | Resolver sozinho, sem ligar para o suporte |
| **Cozinha** | Vê o pedido, marca como pronto | Ler de longe, com a mão suja, sem clicar em coisa errada |
| **Isaac (superadmin)** | Cadastra cliente novo, monta cardápio no onboarding, cobra, bloqueia inadimplente | Saber que caiu antes do dono ligar reclamando |

---

## 5. Modelo de negócio

* **SaaS multi-tenant.** Um único deploy atende todos os clientes. Cada
  estabelecimento é um registro no banco, isolado por `estabelecimento_id`
* **Receita:** mensalidade por estabelecimento — **A DEFINIR (valor)**
* **Cobrança e inadimplência:** o sistema tem o campo `bloqueado`. Estabelecimento
  bloqueado para de aceitar pedido e mostra mensagem neutra ao cliente final,
  não expõe que é falta de pagamento
* **Onboarding:** Isaac cadastra o cardápio inicial. Não é autoatendimento de
  cadastro na Fase 1 — é serviço, e serve para garantir que o cardápio entre certo
* **Custo de infraestrutura:** **A DEFINIR** — precisa medir com o piloto rodando
  para saber a partir de quantos clientes a mensalidade se paga
* **Equipamento:** **A DEFINIR** — o tablet é do dono, alugado, ou incluído?
  Isso muda o preço e a barreira de entrada

---

## 6. Escopo da Fase 1 (piloto)

Escopo fechado. O piloto precisa ir ao ar; nada fora desta lista entra agora.

1. **Totem** (`/:slug`) — mesa → categorias → produto → personalização → carrinho
   → confirmação → senha
2. **Cálculo de preço no servidor** — Edge Function `criar-pedido`
3. **KDS** (`/:slug/cozinha`) — pedidos em tempo real, número da mesa em destaque.
   Divisão de trabalho deliberada: a **cozinha toca uma vez só** ("Pronto"), porque
   mão engordurada não volta na tela. O **garçom** toca "Entregue" ao levar o prato
   e "Devolvida" ao recolher a plaquinha. Contador de plaquinhas livres no alto,
   para a equipe recolher antes de acabar — e não descobrir quando o totem recusar
   um cliente
4. **Painel do dono** (`/:slug/admin`) — esgotar/reativar item, mudar preço
5. **Pagamento no caixa.** O totem só emite senha

### Fora de escopo agora (e por quê)

| Item | Por que fica para depois |
|---|---|
| Pix / maquininha | Pagamento no caixa resolve o piloto. Integração de pagamento é o item mais lento e arriscado do projeto |
| Relatórios de venda | O dono do piloto não pediu. Os dados estão sendo gravados; o relatório pode vir depois sem retrabalho |
| NFC-e / fiscal | Exige contador e certificado. Não bloqueia o piloto |
| Cadastro de cardápio pelo dono | Isaac cadastra no onboarding. Fazer o dono cadastrar exige uma interface bem mais cuidadosa |
| Chamada de senha em painel/TV | O piloto tem garçom levando à mesa |
| App nativo | É web app em tela cheia. Um código serve totem, cozinha e painéis |

---

## 7. O piloto

* **Cliente:** Adorável Burguer (`adoravelburguer`)
* **Operação:** cliente pede no totem, paga no caixa, **garçom leva o pedido à mesa**
* **Plaquinhas:** 40 numeradas, ao lado do totem
  * **A DEFINIR:** quem produz as plaquinhas e quanto custa
  * **Quantidade é decisão de produto, não detalhe.** Plaquinhas suficientes para
    girar uma noite inteira tornam a devolução opcional: se sobra número, esquecer
    de devolver deixa de ter consequência. Medir no piloto quantas ficam em uso no
    pico e dimensionar a partir daí
* **Quantos tablets:** **A DEFINIR**
* **Data de início:** **A DEFINIR**
* **Duração antes de decidir se vira produto:** **A DEFINIR**

### Critério de sucesso — A DEFINIR

Sem isso, no fim do piloto a avaliação vira sensação ("achei que foi bem").
Sugestões de medida, escolher poucas:

* % dos pedidos que entraram pelo totem em vez do caixa
* Pedidos abandonados no meio (cliente desistiu)
* Erro de pedido comparado ao caixa
* O dono conseguiu operar um pico com menos gente que antes?
* O dono renovaria pagando?

---

## 8. Fluxo do cliente no totem

### A plaquinha é o número do pedido

Ao lado do totem fica uma pilha de plaquinhas numeradas. O cliente pega uma,
deixa na mesa onde vai sentar e digita esse número **no fim** do pedido. O garçom
encontra a mesa procurando a plaquinha; no caixa, o cliente fala esse número.

**O sistema não gera número sequencial.** Isso é deliberado: como o cliente pega
qualquer plaquinha, elas voltam para a pilha em qualquer ordem, e ninguém precisa
reorganizá-las no fim do dia. Coerente com a proposta do produto — o sistema tira
trabalho do dono, não adiciona.

### Fluxo

1. Tela inicial com a logo → "Toque para pedir"
2. Categorias → produtos com foto e preço
3. Produto → opções (obrigatórias primeiro) → adicionar ao carrinho
4. Carrinho → revisar
5. **Número da mesa** em teclado grande → confirmar ("Mesa 17, está certo?")
6. "Pedido enviado. Mesa 17. Pague no caixa."
7. Volta sozinho para a tela inicial após 15 segundos

### Número já em uso

Um número fica bloqueado **desde o pedido até alguém marcar que a plaquinha voltou
para a pilha** — não até a entrega. O prato sai e a plaquinha continua na mesa do
cliente.

Se o cliente digitar um número bloqueado, o pedido é **recusado** e a tela pede
para pegar outra plaquinha. O pedido antigo é destacado na cozinha para a equipe
conferir.

**Por que tão rígido:** é isso que pega o cliente que pega a plaquinha 9, lê como
6 e digita 6. Se a 6 estiver na mão de outra pessoa, o totem recusa em vez de
criar dois pedidos com o mesmo número.

**Solução física, mais barata que qualquer software:** marcar um ponto embaixo do
número nas plaquinhas (`6.` e `9.`) elimina a confusão na origem.

**Limite de segurança:** só bloqueia se o pedido for de **hoje**. Plaquinha
esquecida ontem não trava o número hoje — senão os números iriam sumindo um a um
até o totem recusar todo mundo.

**Diretrizes de tela:** alvo de toque mínimo 60px, fonte grande, contraste alto.
É usado em pé, com pressa, por gente de todas as idades. Nada de menu discreto
tipo site de computador.

---

## 9. Regras de produto invioláveis

Não são preferências técnicas — cada uma existe porque a alternativa causa
prejuízo real.

| Regra | Se descumprir |
|---|---|
| **Nada de dado de estabelecimento no código** | Cada cliente novo exigiria um deploy. O modelo SaaS deixa de funcionar |
| **O total nunca é calculado no tablet** | Qualquer pessoa no wi-fi da loja manda pedido de R$ 0,00 |
| **Pedido guarda cópia do nome e do preço** | Dono muda o preço amanhã e a venda de ontem muda junto. Histórico financeiro não pode ser reescrito |
| **Data no fuso do estabelecimento** | Em UTC, "hoje" vira "amanhã" às 21h, no meio do movimento. Isso decide se uma plaquinha ainda está bloqueada e vai decidir todo relatório por dia |
| **Imagem redimensionada antes de subir** | Foto de celular tem 4 MB. 40 delas travam o tablet no wi-fi da loja |
| **Toda tabela nasce com sua regra de acesso** | Consulta volta vazia sem erro e ninguém entende por quê |

---

## 10. Riscos operacionais

| Risco | Tratamento |
|---|---|
| Queda de internet | Erro claro na tela. Nunca aceitar pedido que não foi gravado |
| Cliente desiste no meio | Timeout de inatividade limpa o carrinho e volta ao início |
| Mesa digitada errada | Confirmação explícita antes de enviar + o número é validado contra as plaquinhas cadastradas |
| Plaquinha em uso por outro pedido | Recusa, pede outra plaquinha e destaca o pedido antigo na cozinha. Só considera pedidos de hoje, para não travar a loja |
| Equipe não marca pedidos como entregues | O destaque na cozinha é o empurrão. O limite de "hoje" impede que o problema acumule para o dia seguinte |
| Totem travado / offline | Heartbeat. Isaac precisa saber antes do dono ligar |
| Item esgotado no meio do movimento | Botão "esgotou" no painel do dono, e o servidor recusa pedido de item indisponível |
| Dono pede coisa fora de escopo durante o piloto | Este documento |

---

## 11. Decisões técnicas e o motivo

| Decisão | Motivo |
|---|---|
| Web app, não app nativo | Um código serve totem, cozinha e painéis. Sem loja de aplicativo |
| Tablet **Android** em modo quiosque | Maquininha de cartão só integra em Android — decisão tomada pensando na Fase 2 |
| Supabase | Banco, login, arquivos e tempo real integrados. Menos peça para manter |
| Cálculo em Edge Function | É onde o preço pode ser recalculado fora do alcance do cliente |
| Vercel | Deploy simples |
| Dois ambientes (dev e prod) | Nunca mexer direto onde o cliente está vendendo |

---

## 12. Estado atual — 27/07/2026

**A Fase 1 está construída e testada ponta a ponta.**

* Banco com isolamento entre estabelecimentos **testado na prática** (tentativa de
  gravar na pasta de outra loja foi barrada)
* `criar-pedido` publicada; recusa fraude de total zerado, plaquinha em uso e item
  esgotado
* Totem completo, com limpeza automática se o cliente desistir no meio
* Cozinha (um toque) e balcão (entrega + devolução da plaquinha) em tempo real
* Painel do dono: esgotar/reativar e mudar preço
* Item que esgota aparece marcado no carrinho **na hora**, sem esperar o envio

**Na fila, em ordem de risco:**

1. Restringir alteração de preço ao dono no banco — hoje o login da cozinha
   também conseguiria (a barreira existe só na tela)
2. Cadastrar o cardápio real e apagar o de teste
3. Deploy na Vercel
4. Heartbeat: saber que um totem caiu antes do dono ligar
5. Responder as perguntas abertas da seção 13

---

## 13. Decisões a reavaliar com mais clientes

Decisões tomadas para o piloto que provavelmente mudam quando houver outros
estabelecimentos. Não são dívida técnica — são escolhas conscientes com prazo.

| Decisão | Por que agora | Quando reavaliar |
|---|---|---|
| **Só o dono marca item esgotado** | Em lanchonete pequena o dono está no salão durante o movimento | Cliente cujo dono não fica no salão. Aí a cozinha precisa marcar, e isso exige distinguir no banco "mudou disponibilidade" de "mudou preço", além de um botão na tela da cozinha |
| **Quem pausa o totem** (`aceita_pedidos`) | Hoje qualquer usuário da loja pode. Não decidido de propósito | Pausar quando a cozinha está afogada é plausivelmente ação da cozinha, não do dono. Definir antes de fechar essa permissão |
| **Plaquinha física em vez de senha sequencial** | Tira trabalho do dono: as plaquinhas voltam em qualquer ordem | Cliente que prefira senha chamada em voz alta. A função `proxima_senha` já existe no banco, sem uso, para esse caso |
| **Cadastro de cardápio feito por Isaac** | Garante que o cardápio entre certo, e é oportunidade de conversar com o cliente | Quando o número de clientes tornar o onboarding manual o gargalo |

---

## 14. Perguntas abertas

1. Valor da mensalidade
2. O tablet é do dono ou entra no pacote?
3. Quantos tablets no piloto e onde ficam fisicamente
4. Critério de sucesso do piloto
5. Depois da Fase 1, o que tem mais valor: pagamento no totem, relatório para o
   dono, ou cadastro de cardápio pelo próprio dono?
6. Suporte: como o dono fala com Isaac quando algo dá errado no meio do movimento?
