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
| **Cozinha** | Recebe o pedido impresso na hora (Adorável Burguer: 29/08/2026 em diante, sem tela) | Papel chegando junto com os pedidos do Anota Aí, identificado, sem precisar olhar tablet |
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

1. **Totem** (`/:slug`) — categorias → produto → personalização → carrinho →
   comer aqui/para levar + nome do cliente → confirmação
2. **Cálculo de preço no servidor** — Edge Function `criar-pedido`
3. **Impressão do pedido** — no piloto do Adorável Burguer (decisão de
   29/08/2026), o pedido sai impresso na cozinha (mesma impressora do sistema
   que já usam), sem tela de cozinha/balcão nem mesa/plaquinha. Ver seção 8
4. **Painel do dono** (`/:slug/admin`) — esgotar/reativar item, mudar preço
5. **Pagamento no caixa.** O cliente fala o nome

### Fora de escopo agora (e por quê)

| Item | Por que fica para depois |
|---|---|
| Pix / maquininha | Pagamento no caixa resolve o piloto. Integração de pagamento é o item mais lento e arriscado do projeto |
| Relatórios de venda | O dono do piloto não pediu. Os dados estão sendo gravados; o relatório pode vir depois sem retrabalho |
| NFC-e / fiscal | Exige contador e certificado. Não bloqueia o piloto |
| Cadastro de cardápio pelo dono | Isaac cadastra no onboarding. Fazer o dono cadastrar exige uma interface bem mais cuidadosa |
| Chamada de senha em painel/TV | A senha é só contagem interna; a identificação do pedido é o nome do cliente no cupom impresso |
| App nativo | É web app em tela cheia. Um código serve totem, impressão e painéis |

---

## 7. O piloto

* **Cliente:** Adorável Burguer (`adoravelburguer`)
* **Operação (decidida em 29/08/2026):** cliente pede no totem, escolhe comer no
  local ou levar, digita o nome, paga no caixa. **Sem mesa nem plaquinha** — o
  pedido sai impresso na cozinha (mesma impressora do Anota Aí), identificado
  pelo nome; a equipe entrega chamando/procurando por nome
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

> **Revisado em 29/08/2026.** As duas subseções antigas ("A plaquinha é o
> número do pedido" e "Número já em uso") saíram: o Adorável Burguer não usa
> mesa nem plaquinha física. Ficam registradas na seção 13, porque a plaquinha
> continua sendo uma opção válida para um cliente futuro que prefira esse
> modelo — `mesas` e a lógica de bloqueio só saíram do código deste cliente.

### Sem mesa: nome do cliente identifica o pedido

Na última tela, o cliente escolhe **comer no local ou levar** e digita o
**próprio nome**. Isso é o que sai destacado no cupom impresso na cozinha e o
que a equipe/caixa usa para identificar o pedido — não há plaquinha, não há
número de mesa, e o garçom não precisa saber onde o cliente sentou.

O pedido ganha também uma senha sequencial do dia (`proxima_senha`), mas só
como contagem interna para o dono conferir quantos pedidos saíram pelo totem —
não aparece em destaque em tela nem no cupom.

### Fluxo

1. Tela inicial com a logo → "Toque para pedir"
2. Categorias → produtos com foto e preço
3. Produto → opções (obrigatórias primeiro) → adicionar ao carrinho
4. Carrinho → revisar
5. **Comer aqui/para levar + nome**, teclado nativo do tablet → confirmar
6. "Pedido enviado. [Nome]. Pague no caixa."
7. Volta sozinho para a tela inicial após 5 segundos

### Impressão na cozinha (sem tela de KDS)

O pedido sai impresso direto na cozinha, na mesma impressora onde já saem os
pedidos de outros canais da loja — sem tela de tempo real para acompanhar.
Cabeçalho "PEDIDO TOTEM" e o nome do cliente em destaque evitam confundir com
os pedidos de outro sistema. Papel pode emperrar ou acabar: existe um botão de
reimprimir manual, nunca falha silenciosa.

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
| **Data no fuso do estabelecimento** | Em UTC, "hoje" vira "amanhã" às 21h, no meio do movimento. Isso decide quando a senha sequencial do dia zera e vai decidir todo relatório por dia |
| **Imagem redimensionada antes de subir** | Foto de celular tem 4 MB. 40 delas travam o tablet no wi-fi da loja |
| **Toda tabela nasce com sua regra de acesso** | Consulta volta vazia sem erro e ninguém entende por quê |

---

## 10. Riscos operacionais

| Risco | Tratamento |
|---|---|
| Queda de internet | Erro claro na tela. Nunca aceitar pedido que não foi gravado |
| Cliente desiste no meio | Timeout de inatividade limpa o carrinho e volta ao início |
| Nome digitado errado | Confirmação explícita antes de enviar. Risco bem menor que mesa errada — nome trocado não manda comida pro lugar errado, só obriga perguntar de novo no balcão |
| Impressão falha (papel emperrou/acabou) | Nunca falha silenciosa: tela de impressão mostra "aguardando" e tem botão "Reimprimir" por pedido |
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
| **Plaquinha física em vez de senha sequencial** | Foi a escolha original do piloto: tirava trabalho do dono, plaquinhas voltam em qualquer ordem | **Já revertida para o Adorável Burguer em 29/08/2026** — o dono preferiu tirar mesa/plaquinha de vez (impressão direto na cozinha, nome do cliente identifica). `proxima_senha` voltou a ser usada, mas só como contagem interna. Fica registrada aqui para um cliente futuro que prefira o modelo de plaquinha/mesa — nesse caso a lógica antiga (migrações 002/003) precisaria voltar, hoje o código não a usa mais |
| **Cadastro de cardápio feito por Isaac** | Garante que o cardápio entre certo, e é oportunidade de conversar com o cliente | Quando o número de clientes tornar o onboarding manual o gargalo. Ideia levantada em 28/08/2026: página de edição de cardápio pelo dono (produto novo, categoria, foto) — não é só abrir o que já existe no painel (`/admin` hoje só esgota/reativa e muda preço), precisa decidir o que o dono pode mexer sem risco (ex: nunca deixar tocar em `estabelecimento_id`) |

---

## 14. Perguntas abertas

1. Valor da mensalidade
2. O tablet é do dono ou entra no pacote?
3. Quantos tablets no piloto e onde ficam fisicamente
4. Critério de sucesso do piloto
5. Depois da Fase 1, o que tem mais valor: pagamento no totem, relatório para o
   dono, ou cadastro de cardápio pelo próprio dono?
6. Suporte: como o dono fala com Isaac quando algo dá errado no meio do movimento?

---

## 15. Checklist para efetivar o piloto na loja

**Atualizado em 28/08/2026.** O sistema está pronto do lado do software — o
pedido de ponta a ponta (com combo) já foi testado no site publicado e chegou
certo na cozinha e no balcão. O que falta agora é físico, operacional e um
punhado de decisões de negócio. Marcar conforme for resolvendo.

### Físico / operacional

- [ ] Tablet Android configurado em **modo quiosque** (travado no totem, sem
      dar pra sair do app nem mexer nas configurações — normalmente com um
      app tipo "Fully Kiosk Browser")
- [ ] QZ Tray instalado no computador da loja ligado na Bematech i9, e
      `estabelecimentos.config.impressora_nome` configurado (ver
      `CLAUDE.md`, seção "Impressão do pedido")
- [ ] Wi-fi da loja testado com o tablet físico (`npm --prefix app run
      dev:rede`, ver `docs/ESTADO.md` seção 7 — só faz sentido com o tablet
      em mãos)
- [ ] Equipe treinada: a cozinha recebe o pedido já impresso (identificado
      "PEDIDO TOTEM" + nome do cliente); dono usa `/admin` para esgotar item e
      mudar preço

### Decisões de negócio (A DEFINIR nas seções 5, 7 e 14)

- [ ] Quantos tablets no piloto e onde ficam
- [ ] Data de início e por quanto tempo roda antes de decidir se vira produto
- [ ] Critério de sucesso definido (não avaliar por sensação no fim)
- [ ] Quem paga o tablet — do dono, alugado, ou incluído na mensalidade
- [ ] Canal de suporte combinado — como o dono chama o Isaac no meio do
      movimento se o totem travar

### No dia de ligar o tablet

- [ ] Religar a conferência do heartbeat — comando no fim de
      `supabase/migracao_006_heartbeat_totem.sql` (está pausado de propósito
      até aqui, para não gerar alerta de "sem sinal" com o tablet desligado)
