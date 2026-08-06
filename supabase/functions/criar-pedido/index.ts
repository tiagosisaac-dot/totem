// ============================================================
// EDGE FUNCTION: criar-pedido
//
// Roda NO SERVIDOR. E a peca que garante a REGRA 2:
// o total nunca vem do navegador — e sempre recalculado aqui,
// buscando os precos reais no banco.
//
// O totem manda apenas ESCOLHAS (ids). Se mandar um campo
// "total", "preco" ou parecido, e simplesmente ignorado.
//
// O numero da mesa e a plaquinha que o cliente pegou ao lado do totem
// e digitou no fim do pedido. O sistema NAO gera numero sequencial.
//
// Entrada esperada (POST, JSON):
// {
//   "slug": "adoravelburguer",
//   "mesa_numero": 17,
//   "observacao": "sem pressa",              // opcional
//   "itens": [
//     {
//       "produto_id": "uuid",
//       "quantidade": 2,
//       "observacao": "bem passado",          // opcional
//       "opcoes": ["uuid-opcao", "uuid-opcao"],           // opcional
//       "combo_escolhas": [                                // so em combos
//         { "slot_id": "uuid", "produto_id": "uuid" }
//       ]
//     }
//   ]
// }
//
// Saida: { "pedido_id": "uuid", "mesa_numero": 17, "total": "48.50" }
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

// ------------------------------------------------------------
// Limites de sanidade: barram pedido absurdo antes de tocar o banco
// ------------------------------------------------------------
const MAX_ITENS = 50
const MAX_QUANTIDADE = 99
const MAX_OPCOES_POR_ITEM = 30

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ------------------------------------------------------------
// Dinheiro em CENTAVOS (numero inteiro).
// Somar 0.1 + 0.2 em ponto flutuante da 0.30000000000000004.
// Em centavos isso nao acontece.
// ------------------------------------------------------------
const paraCentavos = (valor: unknown) => Math.round(Number(valor ?? 0) * 100)
const paraReais = (centavos: number) => (centavos / 100).toFixed(2)

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Erro que o totem sabe mostrar para o cliente.
//
// 'extra' carrega informacao para o totem AGIR, nao so exibir:
//   codigo: 'item_esgotado'  -> leva o cliente de volta ao carrinho
//   itens: [{ indice, nome }] -> TODAS as linhas a destacar, com o
//          nome do que esgotou (num combo, e o item de dentro)
//
// O totem nunca deve adivinhar o motivo lendo a frase: mudar o texto
// da mensagem quebraria o comportamento sem ninguem perceber.
class ErroPedido extends Error {
  status: number
  extra: Record<string, unknown>
  constructor(mensagem: string, status = 400, extra: Record<string, unknown> = {}) {
    super(mensagem)
    this.status = status
    this.extra = extra
  }
}

type ComboEscolha = { slot_id: string; produto_id: string }
type ItemEntrada = {
  produto_id: string
  quantidade?: number
  observacao?: string | null
  opcoes?: string[]
  combo_escolhas?: ComboEscolha[]
}

const ehUuid = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

const texto = (v: unknown, max = 280) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : null

Deno.serve(async (req) => {
  // O navegador manda um OPTIONS antes do POST para perguntar
  // "posso chamar essa URL?". Isso responde essa pergunta.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405)

  // service_role: chave de administrador do banco. So existe aqui dentro,
  // NUNCA no frontend. E ela que permite gravar em pedidos (o anon nao pode).
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  let pedidoCriadoId: string | null = null

  try {
    // ========================================================
    // 1. LER E CONFERIR O FORMATO DA ENTRADA
    // ========================================================
    let corpo: Record<string, unknown>
    try {
      corpo = await req.json()
    } catch {
      throw new ErroPedido('Corpo da requisição não é um JSON válido.')
    }

    const slug = texto(corpo.slug, 60)
    if (!slug) throw new ErroPedido('Informe o slug do estabelecimento.')

    const itensEntrada = corpo.itens
    if (!Array.isArray(itensEntrada) || itensEntrada.length === 0) {
      throw new ErroPedido('O pedido está vazio.')
    }
    if (itensEntrada.length > MAX_ITENS) {
      throw new ErroPedido(`Pedido com itens demais (máximo ${MAX_ITENS}).`)
    }

    const itens: ItemEntrada[] = itensEntrada.map((bruto, i) => {
      const linha = i + 1
      if (typeof bruto !== 'object' || bruto === null) {
        throw new ErroPedido(`Item ${linha} inválido.`)
      }
      const item = bruto as Record<string, unknown>

      if (!ehUuid(item.produto_id)) {
        throw new ErroPedido(`Item ${linha}: produto inválido.`)
      }

      const quantidade = item.quantidade === undefined ? 1 : Number(item.quantidade)
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_QUANTIDADE) {
        throw new ErroPedido(`Item ${linha}: quantidade deve ser de 1 a ${MAX_QUANTIDADE}.`)
      }

      const opcoes = item.opcoes === undefined ? [] : item.opcoes
      if (!Array.isArray(opcoes) || opcoes.length > MAX_OPCOES_POR_ITEM || !opcoes.every(ehUuid)) {
        throw new ErroPedido(`Item ${linha}: lista de opções inválida.`)
      }

      const escolhasBrutas = item.combo_escolhas === undefined ? [] : item.combo_escolhas
      if (!Array.isArray(escolhasBrutas)) {
        throw new ErroPedido(`Item ${linha}: escolhas do combo inválidas.`)
      }
      const combo_escolhas: ComboEscolha[] = escolhasBrutas.map((e) => {
        const esc = e as Record<string, unknown>
        if (!ehUuid(esc?.slot_id) || !ehUuid(esc?.produto_id)) {
          throw new ErroPedido(`Item ${linha}: escolha de combo inválida.`)
        }
        return { slot_id: esc.slot_id as string, produto_id: esc.produto_id as string }
      })

      return {
        produto_id: item.produto_id as string,
        quantidade,
        observacao: texto(item.observacao),
        // ids repetidos viram um so: pedir "bacon" duas vezes no mesmo
        // grupo nao deve cobrar dobrado
        opcoes: [...new Set(opcoes as string[])],
        combo_escolhas,
      }
    })

    // ========================================================
    // 2. ESTABELECIMENTO: existe? esta vendendo?
    // ========================================================
    const { data: estab, error: erroEstab } = await sb
      .from('estabelecimentos')
      .select('id, nome, ativo, bloqueado, mensagem_bloqueio, aceita_pedidos, fuso')
      .eq('slug', slug)
      .maybeSingle()

    if (erroEstab) throw erroEstab
    if (!estab) throw new ErroPedido('Estabelecimento não encontrado.', 404)
    if (!estab.ativo || estab.bloqueado) {
      throw new ErroPedido(estab.mensagem_bloqueio ?? 'Sistema temporariamente indisponível.', 403)
    }
    if (!estab.aceita_pedidos) {
      throw new ErroPedido('Não estamos aceitando pedidos neste momento.', 409)
    }

    // ========================================================
    // 3. NUMERO DA MESA (a plaquinha que o cliente pegou)
    //
    // E a identificacao do pedido: fica na mesa para o garcom achar,
    // e e o que o cliente fala no caixa. Por isso e obrigatorio.
    // ========================================================
    const mesaNumero = Number(corpo.mesa_numero)
    if (!Number.isInteger(mesaNumero) || mesaNumero < 1) {
      throw new ErroPedido('Informe o número da mesa.')
    }

    // barra erro de digitacao: mesa 99 numa loja com 40 plaquinhas
    const { data: mesa, error: erroMesa } = await sb
      .from('mesas')
      .select('numero')
      .eq('estabelecimento_id', estab.id)
      .eq('numero', mesaNumero)
      .eq('ativa', true)
      .maybeSingle()

    if (erroMesa) throw erroMesa
    if (!mesa) throw new ErroPedido(`Mesa ${mesaNumero} não existe. Confira o número.`)

    // ---- essa plaquinha ainda esta fora? ----
    //
    // O que bloqueia NAO e o status do pedido: e a plaquinha nao ter
    // voltado para a pilha. O prato pode ja ter sido entregue e a
    // plaquinha continuar na mesa do cliente.
    //
    // E isso que pega o cliente que pega a plaquinha 9, le como 6 e
    // digita 6: se a 6 estiver na mao de outra pessoa, o totem recusa.
    const { data: emAberto, error: erroAberto } = await sb
      .from('pedidos')
      .select('id, criado_em')
      .eq('estabelecimento_id', estab.id)
      .eq('mesa_numero', mesaNumero)
      .is('plaquinha_devolvida_em', null)
      .neq('status', 'cancelado')

    if (erroAberto) throw erroAberto

    // REGRA 4: o dia e o do fuso do estabelecimento, nao UTC.
    // So pedido aberto DE HOJE bloqueia o numero. Se a equipe esqueceu
    // de marcar entrega ontem, a plaquinha volta a funcionar hoje —
    // senao os numeros iriam sumindo um a um ate o totem travar.
    const diaLocal = (quando: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: estab.fuso,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(quando)

    const hoje = diaLocal(new Date())
    const conflitos = (emAberto ?? []).filter((p) => diaLocal(new Date(p.criado_em)) === hoje)

    if (conflitos.length > 0) {
      // marca o pedido antigo para o KDS destacar: a equipe precisa
      // confirmar a entrega para liberar o numero
      await sb
        .from('pedidos')
        .update({ alerta_reuso_em: new Date().toISOString() })
        .in(
          'id',
          conflitos.map((p) => p.id),
        )

      throw new ErroPedido(
        `A mesa ${mesaNumero} já está em uso por outro pedido. ` +
          `Pegue outra plaquinha e tente novamente.`,
        409,
      )
    }

    // ========================================================
    // 4. BUSCAR NO BANCO TUDO QUE FOI PEDIDO
    //    (produtos do carrinho + produtos escolhidos dentro de combos)
    // ========================================================
    const idsProdutosTopo = [...new Set(itens.map((i) => i.produto_id))]
    const idsProdutosCombo = [
      ...new Set(itens.flatMap((i) => i.combo_escolhas!.map((e) => e.produto_id))),
    ]
    const idsProdutos = [...new Set([...idsProdutosTopo, ...idsProdutosCombo])]

    // eq(estabelecimento_id) e o que impede pedir produto de OUTRA loja
    const { data: produtos, error: erroProd } = await sb
      .from('produtos')
      .select('id, nome, preco, tipo, disponivel, vendavel_sozinho')
      .eq('estabelecimento_id', estab.id)
      .in('id', idsProdutos)

    if (erroProd) throw erroProd
    const mapaProdutos = new Map((produtos ?? []).map((p) => [p.id, p]))

    // Grupos de opcoes ligados a cada produto (para saber o que e permitido
    // e o que e obrigatorio)
    const { data: vinculos, error: erroVinc } = await sb
      .from('produto_grupos')
      .select(
        'produto_id, grupo_id, grupos_opcoes!inner(id, nome, min_selecao, max_selecao, ativo, estabelecimento_id)',
      )
      .in('produto_id', idsProdutosTopo)

    if (erroVinc) throw erroVinc

    type Grupo = {
      id: string
      nome: string
      min_selecao: number
      max_selecao: number | null
      ativo: boolean
      estabelecimento_id: string
    }
    // produto -> grupos permitidos
    const gruposDoProduto = new Map<string, Grupo[]>()
    for (const v of vinculos ?? []) {
      const g = v.grupos_opcoes as unknown as Grupo
      if (!g?.ativo || g.estabelecimento_id !== estab.id) continue
      const lista = gruposDoProduto.get(v.produto_id) ?? []
      lista.push(g)
      gruposDoProduto.set(v.produto_id, lista)
    }

    // Opcoes escolhidas
    const idsOpcoes = [...new Set(itens.flatMap((i) => i.opcoes!))]
    const mapaOpcoes = new Map<
      string,
      { id: string; grupo_id: string; nome: string; preco_adicional: number; disponivel: boolean }
    >()
    if (idsOpcoes.length > 0) {
      const { data: opcoes, error: erroOp } = await sb
        .from('opcoes')
        .select('id, grupo_id, nome, preco_adicional, disponivel')
        .in('id', idsOpcoes)
      if (erroOp) throw erroOp
      for (const o of opcoes ?? []) mapaOpcoes.set(o.id, o)
    }

    // Slots de combo (so dos produtos que sao combo)
    const idsCombos = idsProdutosTopo.filter((id) => mapaProdutos.get(id)?.tipo === 'combo')
    type Slot = {
      id: string
      combo_id: string
      nome: string
      min_selecao: number
      max_selecao: number
      combo_slot_produtos: { produto_id: string; preco_adicional: number }[]
    }
    const slotsDoCombo = new Map<string, Slot[]>()
    if (idsCombos.length > 0) {
      const { data: slots, error: erroSlot } = await sb
        .from('combo_slots')
        .select('id, combo_id, nome, min_selecao, max_selecao, combo_slot_produtos(produto_id, preco_adicional)')
        .in('combo_id', idsCombos)
      if (erroSlot) throw erroSlot
      for (const s of (slots ?? []) as unknown as Slot[]) {
        const lista = slotsDoCombo.get(s.combo_id) ?? []
        lista.push(s)
        slotsDoCombo.set(s.combo_id, lista)
      }
    }

    // ========================================================
    // 5. VALIDAR E RECALCULAR — o coracao da Regra 2
    // ========================================================
    type LinhaOpcao = { opcao_id: string; nome_snap: string; preco_snap: string }
    type LinhaFilho = { produto_id: string; nome_snap: string; preco_snap: string }
    type LinhaItem = {
      produto_id: string
      nome_snap: string
      preco_snap: string
      quantidade: number
      subtotal: string
      observacao: string | null
      opcoes: LinhaOpcao[]
      filhos: LinhaFilho[]
    }

    const linhas: LinhaItem[] = []
    let totalCentavos = 0

    // Itens esgotados sao COLETADOS, nao interrompem na hora.
    //
    // Parar no primeiro faria o cliente descobrir os problemas um por
    // um, no pior momento possivel. Um refrigerante esgotado invalida
    // tanto a linha dele quanto a do combo que o contem — as duas
    // precisam aparecer marcadas de uma vez.
    //
    // Erro de formato (produto inexistente, opcao de outro produto)
    // continua interrompendo na hora: isso e bug de codigo, nao
    // situacao normal de operacao.
    const esgotados: { indice: number; nome: string }[] = []
    const anotarEsgotado = (indice: number, nome: string) => {
      // uma linha so precisa de um motivo
      if (!esgotados.some((e) => e.indice === indice)) esgotados.push({ indice, nome })
    }

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i]
      const produto = mapaProdutos.get(item.produto_id)
      const rotulo = `Item ${i + 1}`

      if (!produto) throw new ErroPedido(`${rotulo}: produto não encontrado no cardápio.`)
      if (!produto.disponivel) anotarEsgotado(i, produto.nome)
      if (!produto.vendavel_sozinho) {
        throw new ErroPedido(`${produto.nome} só pode ser pedido dentro de um combo.`)
      }

      let extrasCentavos = 0

      // ---- 5a. Opcoes (adicionais, remocoes, escolhas) ----
      const permitidos = gruposDoProduto.get(produto.id) ?? []
      const idsPermitidos = new Set(permitidos.map((g) => g.id))
      const escolhidasPorGrupo = new Map<string, number>()
      const linhasOpcoes: LinhaOpcao[] = []

      for (const idOpcao of item.opcoes!) {
        const opcao = mapaOpcoes.get(idOpcao)
        if (!opcao) throw new ErroPedido(`${rotulo}: opção não encontrada.`)
        // impede pedir "sem cebola" num refrigerante
        if (!idsPermitidos.has(opcao.grupo_id)) {
          throw new ErroPedido(`${rotulo}: "${opcao.nome}" não é uma opção de ${produto.nome}.`)
        }
        if (!opcao.disponivel) anotarEsgotado(i, opcao.nome)

        escolhidasPorGrupo.set(opcao.grupo_id, (escolhidasPorGrupo.get(opcao.grupo_id) ?? 0) + 1)
        extrasCentavos += paraCentavos(opcao.preco_adicional)
        linhasOpcoes.push({
          opcao_id: opcao.id,
          nome_snap: opcao.nome,
          preco_snap: paraReais(paraCentavos(opcao.preco_adicional)),
        })
      }

      // minimo e maximo de cada grupo (inclusive grupos onde nada foi escolhido)
      for (const grupo of permitidos) {
        const quantas = escolhidasPorGrupo.get(grupo.id) ?? 0
        if (quantas < grupo.min_selecao) {
          throw new ErroPedido(
            `${produto.nome}: escolha ${grupo.min_selecao} opção(ões) em "${grupo.nome}".`,
          )
        }
        if (grupo.max_selecao !== null && quantas > grupo.max_selecao) {
          throw new ErroPedido(
            `${produto.nome}: no máximo ${grupo.max_selecao} opção(ões) em "${grupo.nome}".`,
          )
        }
      }

      // ---- 5b. Combo (mecanismo diferente de adicional) ----
      const linhasFilhos: LinhaFilho[] = []

      if (produto.tipo === 'combo') {
        const slots = slotsDoCombo.get(produto.id) ?? []
        const idsSlotsValidos = new Set(slots.map((s) => s.id))

        for (const escolha of item.combo_escolhas!) {
          if (!idsSlotsValidos.has(escolha.slot_id)) {
            throw new ErroPedido(`${rotulo}: escolha não pertence a ${produto.nome}.`)
          }
        }

        for (const slot of slots) {
          const escolhas = item.combo_escolhas!.filter((e) => e.slot_id === slot.id)
          if (escolhas.length < slot.min_selecao) {
            throw new ErroPedido(`${produto.nome}: escolha em "${slot.nome}".`)
          }
          if (escolhas.length > slot.max_selecao) {
            throw new ErroPedido(
              `${produto.nome}: no máximo ${slot.max_selecao} em "${slot.nome}".`,
            )
          }

          for (const escolha of escolhas) {
            const permitido = slot.combo_slot_produtos.find(
              (p) => p.produto_id === escolha.produto_id,
            )
            if (!permitido) {
              throw new ErroPedido(`${produto.nome}: opção inválida em "${slot.nome}".`)
            }
            const filho = mapaProdutos.get(escolha.produto_id)
            if (!filho) throw new ErroPedido(`${rotulo}: produto do combo não encontrado.`)
            if (!filho.disponivel) anotarEsgotado(i, filho.nome)

            // dentro do combo cobra-se apenas o upgrade, nao o preco cheio
            const upgrade = paraCentavos(permitido.preco_adicional)
            extrasCentavos += upgrade
            linhasFilhos.push({
              produto_id: filho.id,
              nome_snap: filho.nome,
              preco_snap: paraReais(upgrade),
            })
          }
        }
      } else if (item.combo_escolhas!.length > 0) {
        throw new ErroPedido(`${produto.nome} não é um combo.`)
      }

      // ---- 5c. Conta final do item ----
      const precoBase = paraCentavos(produto.preco)
      const subtotal = (precoBase + extrasCentavos) * item.quantidade
      totalCentavos += subtotal

      linhas.push({
        produto_id: produto.id,
        nome_snap: produto.nome, // REGRA 3: copia. Nunca JOIN no historico.
        preco_snap: paraReais(precoBase),
        quantidade: item.quantidade!,
        subtotal: paraReais(subtotal),
        observacao: item.observacao ?? null,
        opcoes: linhasOpcoes,
        filhos: linhasFilhos,
      })
    }

    // Todas as linhas conferidas: agora sim recusa, de uma vez.
    if (esgotados.length > 0) {
      const nomes = [...new Set(esgotados.map((e) => e.nome))]
      const mensagem =
        nomes.length === 1
          ? `${nomes[0]} está esgotado.`
          : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)} estão esgotados.`

      throw new ErroPedido(mensagem, 409, { codigo: 'item_esgotado', itens: esgotados })
    }

    // ========================================================
    // 6. GRAVAR
    //
    // Sem chamar proxima_senha: o numero do pedido e a plaquinha que
    // o cliente digitou. A coluna 'senha' fica vazia de proposito.
    // Se qualquer parte falhar, apaga o pedido inteiro: melhor
    // "tente de novo" que meio pedido na cozinha.
    // ========================================================
    const { data: pedido, error: erroPedido } = await sb
      .from('pedidos')
      .insert({
        estabelecimento_id: estab.id,
        mesa_numero: mesaNumero,
        total: paraReais(totalCentavos), // calculado AQUI, nunca recebido
        forma_pagamento: 'caixa',
        observacao: texto(corpo.observacao),
        origem: 'totem',
      })
      .select('id, mesa_numero')
      .single()

    if (erroPedido) throw erroPedido
    pedidoCriadoId = pedido.id

    for (const linha of linhas) {
      const { data: itemGravado, error: erroItem } = await sb
        .from('pedido_itens')
        .insert({
          pedido_id: pedido.id,
          produto_id: linha.produto_id,
          nome_snap: linha.nome_snap,
          preco_snap: linha.preco_snap,
          quantidade: linha.quantidade,
          subtotal: linha.subtotal,
          observacao: linha.observacao,
        })
        .select('id')
        .single()

      if (erroItem) throw erroItem

      if (linha.opcoes.length > 0) {
        const { error: erroOpcoes } = await sb.from('pedido_item_opcoes').insert(
          linha.opcoes.map((o) => ({
            pedido_item_id: itemGravado.id,
            opcao_id: o.opcao_id,
            nome_snap: o.nome_snap,
            preco_snap: o.preco_snap,
          })),
        )
        if (erroOpcoes) throw erroOpcoes
      }

      // produtos escolhidos dentro do combo apontam para a linha do combo
      if (linha.filhos.length > 0) {
        const { error: erroFilhos } = await sb.from('pedido_itens').insert(
          linha.filhos.map((f) => ({
            pedido_id: pedido.id,
            produto_id: f.produto_id,
            nome_snap: f.nome_snap,
            preco_snap: f.preco_snap,
            quantidade: 1,
            subtotal: '0.00', // ja contabilizado no subtotal do combo
            combo_pai_id: itemGravado.id,
          })),
        )
        if (erroFilhos) throw erroFilhos
      }
    }

    return resposta({
      pedido_id: pedido.id,
      mesa_numero: pedido.mesa_numero,
      total: paraReais(totalCentavos),
    })
  } catch (e) {
    // desfaz pedido pela metade
    if (pedidoCriadoId) {
      await sb.from('pedidos').delete().eq('id', pedidoCriadoId)
    }

    if (e instanceof ErroPedido) {
      return resposta({ erro: e.message, ...e.extra }, e.status)
    }

    // erro inesperado: detalhe fica no log, cliente ve mensagem generica
    console.error('criar-pedido falhou:', e)
    return resposta({ erro: 'Não foi possível enviar o pedido. Tente novamente.' }, 500)
  }
})
