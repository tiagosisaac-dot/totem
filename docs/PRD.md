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
3. **KDS da cozinha** (`/:slug/cozinha`) — pedidos em tempo real, botão "pronto",
   número da mesa em destaque
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
* **Mesas:** 40, numeradas fisicamente
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

1. Tela inicial com a logo → "Toque para pedir"
2. **Número da mesa**, em teclado grande
3. Categorias → produtos com foto e preço
4. Produto → opções (obrigatórias primeiro) → adicionar ao carrinho
5. Carrinho → revisar → **confirmar mesa** ("Mesa 7, está certo?")
6. "Pedido enviado. Senha 23. Pague no caixa."
7. Volta sozinho para a tela inicial após 15 segundos

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
| **Data no fuso do estabelecimento** | A senha do dia zera às 21h, no meio do movimento |
| **Imagem redimensionada antes de subir** | Foto de celular tem 4 MB. 40 delas travam o tablet no wi-fi da loja |
| **Toda tabela nasce com sua regra de acesso** | Consulta volta vazia sem erro e ninguém entende por quê |

---

## 10. Riscos operacionais

| Risco | Tratamento |
|---|---|
| Queda de internet | Erro claro na tela. Nunca aceitar pedido que não foi gravado |
| Cliente desiste no meio | Timeout de inatividade limpa o carrinho e volta ao início |
| Mesa digitada errada | Confirmação explícita antes de enviar + a mesa é validada contra as mesas cadastradas |
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

**Pronto e testado:**

* Banco criado com todas as tabelas, isolamento entre estabelecimentos
  **testado na prática** (tentativa de gravar na pasta de outra loja foi barrada)
* Armazenamento de imagens configurado
* Edge Function `criar-pedido` publicada e testada com 7 casos, incluindo
  tentativa de fraude enviando total zerado — o servidor devolveu o valor real
* Projeto React criado
* 40 mesas e um cardápio de teste cadastrados

**Próximo:** telas do totem.

---

## 13. Perguntas abertas

1. Valor da mensalidade
2. O tablet é do dono ou entra no pacote?
3. Quantos tablets no piloto e onde ficam fisicamente
4. Critério de sucesso do piloto
5. Depois da Fase 1, o que tem mais valor: pagamento no totem, relatório para o
   dono, ou cadastro de cardápio pelo próprio dono?
6. Suporte: como o dono fala com Isaac quando algo dá errado no meio do movimento?
