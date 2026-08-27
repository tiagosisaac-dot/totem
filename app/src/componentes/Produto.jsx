// ============================================================
// PRODUTO — personalizacao antes de ir para o carrinho
//
// Dois mecanismos diferentes convivem aqui:
//
//   GRUPOS DE OPCOES  (produto simples)
//     'escolha'   -> obrigatoria, normalmente 1 de N (ponto da carne)
//     'adicional' -> soma preco (bacon)
//     'remocao'   -> preco zero (sem cebola)
//
//   SLOTS DE COMBO  (produto tipo 'combo')
//     combo e um produto que CONTEM produtos. Nao confundir com
//     adicional: aqui o cliente escolhe o sanduiche e a bebida.
//
// >>> O TOTAL MOSTRADO AQUI E SO PARA O CLIENTE VER. <<<
// Quando o pedido e enviado, a Edge Function busca os precos no
// banco e recalcula tudo do zero (REGRA 2). Nunca mande este
// numero para o servidor achando que economiza trabalho.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { emReais } from '../lib/formato.js'

export default function Produto({ produto, corTexto, corFundo, aoVoltar, aoAdicionar }) {
  const [estado, setEstado] = useState('carregando')
  const [grupos, setGrupos] = useState([])
  const [slots, setSlots] = useState([])
  const [selecionadas, setSelecionadas] = useState({}) // { grupoId: [opcaoId] }
  const [escolhasCombo, setEscolhasCombo] = useState({}) // { slotId: [produtoId] }
  const [quantidade, setQuantidade] = useState(1)

  const ehCombo = produto.tipo === 'combo'

  useEffect(() => {
    let cancelado = false

    async function carregarPersonalizacao() {
      setEstado('carregando')

      const [respGrupos, respSlots] = await Promise.all([
        supabase
          .from('produto_grupos')
          .select(
            // opcoes!opcoes_grupo_id_fkey: precisa nomear a relacao porque
            // depende_da_opcao_id criou um SEGUNDO caminho entre
            // grupos_opcoes e opcoes. Sem isso o PostgREST recusa a
            // consulta inteira (PGRST201, "mais de um relacionamento
            // encontrado") — foi o que quebrou TODO produto no ar depois
            // da migracao 007, ate essa correcao.
            'ordem, grupos_opcoes!inner(id, nome, tipo, min_selecao, max_selecao, ativo, ' +
              'depende_da_opcao_id, opcoes!opcoes_grupo_id_fkey(id, nome, preco_adicional, disponivel, ordem))',
          )
          .eq('produto_id', produto.id)
          .order('ordem'),
        ehCombo
          ? supabase
              .from('combo_slots')
              .select(
                'id, nome, min_selecao, max_selecao, ordem, ' +
                  'combo_slot_produtos(preco_adicional, produtos(id, nome, disponivel))',
              )
              .eq('combo_id', produto.id)
              .order('ordem')
          : Promise.resolve({ data: [], error: null }),
      ])

      if (cancelado) return

      if (respGrupos.error || respSlots.error) {
        console.error('Falha ao carregar o produto:', respGrupos.error || respSlots.error)
        setEstado('erro')
        return
      }

      // grupo desativado pelo dono nao aparece; opcoes vem em ordem
      const listaGrupos = respGrupos.data
        .map((vinculo) => vinculo.grupos_opcoes)
        .filter((grupo) => grupo?.ativo)
        .map((grupo) => ({
          ...grupo,
          opcoes: [...grupo.opcoes].sort((a, b) => a.ordem - b.ordem),
        }))

      setGrupos(listaGrupos)
      setSlots(respSlots.data ?? [])
      setEstado('pronto')
    }

    carregarPersonalizacao()
    return () => {
      cancelado = true
    }
  }, [produto.id, ehCombo])

  // ----------------------------------------------------------
  // Selecao
  // ----------------------------------------------------------
  function alternar(chave, valor, max, mapa, setMapa) {
    setMapa((atual) => {
      const jaEscolhidas = atual[chave] ?? []
      const jaTem = jaEscolhidas.includes(valor)

      if (jaTem) return { ...atual, [chave]: jaEscolhidas.filter((v) => v !== valor) }

      // escolher 1 de N: o novo substitui o anterior, sem precisar
      // desmarcar antes (menos toque para o cliente)
      if (max === 1) return { ...atual, [chave]: [valor] }

      if (max !== null && jaEscolhidas.length >= max) return atual
      return { ...atual, [chave]: [...jaEscolhidas, valor] }
    })
  }

  // ----------------------------------------------------------
  // Grupos condicionais — "Bebida do combo" so existe depois que
  // "Transformar em combo" for marcado (depende_da_opcao_id).
  //
  // Filtrar aqui, num lugar so, evita ter que apagar a escolha do
  // grupo escondido quando o gatilho e desmarcado: ela so fica sem
  // efeito (nao conta preco, nao e exigida, nao vai para o servidor)
  // ate o grupo aparecer nas novo. Se o cliente marcar o combo de
  // novo na mesma visita, a bebida que ele tinha escolhido volta.
  // ----------------------------------------------------------
  const idsOpcoesSelecionadas = useMemo(
    () => new Set(Object.values(selecionadas).flat()),
    [selecionadas],
  )

  const gruposVisiveis = useMemo(
    () =>
      grupos.filter(
        (grupo) =>
          !grupo.depende_da_opcao_id || idsOpcoesSelecionadas.has(grupo.depende_da_opcao_id),
      ),
    [grupos, idsOpcoesSelecionadas],
  )

  // ----------------------------------------------------------
  // Preco de UM, com o que foi escolhido (vitrine — o servidor
  // recalcula, ver aviso no topo).
  //
  // Fica separado da quantidade de proposito: o carrinho deixa o
  // cliente mudar o numero de itens depois, e para recalcular a
  // linha ele precisa saber quanto custa UM. Multiplicar aqui e
  // guardar so o total deixaria o carrinho sem essa conta.
  // ----------------------------------------------------------
  const unitarioMostrado = useMemo(() => {
    let unitario = Number(produto.preco) || 0

    for (const grupo of gruposVisiveis) {
      for (const idOpcao of selecionadas[grupo.id] ?? []) {
        const opcao = grupo.opcoes.find((o) => o.id === idOpcao)
        unitario += Number(opcao?.preco_adicional) || 0
      }
    }

    for (const slot of slots) {
      for (const idProduto of escolhasCombo[slot.id] ?? []) {
        const item = slot.combo_slot_produtos.find((p) => p.produtos?.id === idProduto)
        unitario += Number(item?.preco_adicional) || 0
      }
    }

    return unitario
  }, [produto.preco, gruposVisiveis, slots, selecionadas, escolhasCombo])

  const totalMostrado = unitarioMostrado * quantidade

  // O que o cliente escolheu vale para a LINHA inteira, nao para um
  // sanduiche. Com quantidade 1 isso e obvio; com 3 nao e, e ele so
  // descobriria no carrinho — ou pior, na mesa. Entao a tela avisa.
  const escolheuAlgo =
    gruposVisiveis.some((grupo) => (selecionadas[grupo.id] ?? []).length > 0) ||
    Object.values(escolhasCombo).some((ids) => ids.length > 0)

  // ----------------------------------------------------------
  // O que ainda falta escolher
  //
  // A mesma checagem existe no servidor. Aqui ela serve para o
  // cliente entender o que falta, nao para garantir nada.
  // ----------------------------------------------------------
  const pendencia = useMemo(() => {
    for (const grupo of gruposVisiveis) {
      const quantas = (selecionadas[grupo.id] ?? []).length
      if (quantas < grupo.min_selecao) return `Escolha: ${grupo.nome}`
    }
    for (const slot of slots) {
      const quantas = (escolhasCombo[slot.id] ?? []).length
      if (quantas < slot.min_selecao) return `Escolha: ${slot.nome}`
    }
    return null
  }, [gruposVisiveis, slots, selecionadas, escolhasCombo])

  if (estado === 'carregando') {
    return <Recado texto="Carregando..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (estado === 'erro') {
    return (
      <Recado
        texto="Não foi possível abrir este item"
        corTexto={corTexto}
        corFundo={corFundo}
        aoVoltar={aoVoltar}
      />
    )
  }

  function confirmar() {
    // nomes do que foi escolhido, SO PARA EXIBIR no carrinho.
    // O que vai para o servidor sao os ids, logo abaixo.
    //
    // So os grupos VISIVEIS entram aqui. Se o cliente marcou uma
    // bebida do combo e depois desmarcou o combo, essa escolha fica
    // para tras — nem aparece no resumo, nem e cobrada, nem vai para
    // o servidor.
    const resumo = [
      ...slots.flatMap((slot) =>
        (escolhasCombo[slot.id] ?? []).map(
          (id) => slot.combo_slot_produtos.find((p) => p.produtos?.id === id)?.produtos?.nome,
        ),
      ),
      ...gruposVisiveis.flatMap((grupo) =>
        (selecionadas[grupo.id] ?? []).map(
          (id) => grupo.opcoes.find((o) => o.id === id)?.nome,
        ),
      ),
    ].filter(Boolean)

    aoAdicionar({
      produto,
      quantidade,
      // ids das opcoes escolhidas, achatados numa lista so —
      // e o formato que a Edge Function espera
      opcoes: gruposVisiveis.flatMap((grupo) => selecionadas[grupo.id] ?? []),
      comboEscolhas: Object.entries(escolhasCombo).flatMap(([slotId, produtos]) =>
        produtos.map((produtoId) => ({ slot_id: slotId, produto_id: produtoId })),
      ),
      resumo,
      // vitrine; o servidor recalcula. O unitario vai junto porque o
      // carrinho refaz a conta quando o cliente muda a quantidade la.
      unitarioMostrado,
      totalMostrado,
    })
  }

  const borda = `${corTexto}22`

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <header
        className="flex items-center gap-3 border-b-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4"
        style={{ borderColor: borda }}
      >
        <button
          onClick={aoVoltar}
          className="min-h-[60px] shrink-0 rounded-xl border-4 px-5 text-xl font-bold active:scale-95 sm:px-6 sm:text-2xl"
          style={{ borderColor: corTexto }}
        >
          ← Voltar
        </button>
        <h1 className="min-w-0 truncate text-2xl font-black sm:text-3xl">{produto.nome}</h1>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="mb-8">
          {produto.descricao && <p className="text-2xl opacity-70">{produto.descricao}</p>}
          <p className="mt-2 text-3xl font-black">{emReais(produto.preco)}</p>
        </div>

        {/* itens que compoem o combo */}
        {slots.map((slot) => (
          <Bloco
            key={slot.id}
            titulo={slot.nome}
            obrigatorio={slot.min_selecao > 0}
            limite={slot.max_selecao}
            corTexto={corTexto}
            corFundo={corFundo}
          >
            {slot.combo_slot_produtos
              .filter((item) => item.produtos)
              .map((item) => (
                <Escolha
                  key={item.produtos.id}
                  rotulo={item.produtos.nome}
                  precoExtra={item.preco_adicional}
                  esgotado={!item.produtos.disponivel}
                  marcada={(escolhasCombo[slot.id] ?? []).includes(item.produtos.id)}
                  corTexto={corTexto}
                  corFundo={corFundo}
                  aoTocar={() =>
                    alternar(
                      slot.id,
                      item.produtos.id,
                      slot.max_selecao,
                      escolhasCombo,
                      setEscolhasCombo,
                    )
                  }
                />
              ))}
          </Bloco>
        ))}

        {/* adicionais, remocoes e escolhas. So os visiveis: um grupo
            com depende_da_opcao_id preenchido nao aparece ate a
            opcao-gatilho ser marcada (ex.: Bebida do combo). */}
        {gruposVisiveis.map((grupo) => (
          <Bloco
            key={grupo.id}
            titulo={grupo.nome}
            obrigatorio={grupo.min_selecao > 0}
            limite={grupo.max_selecao}
            corTexto={corTexto}
            corFundo={corFundo}
          >
            {grupo.opcoes.map((opcao) => (
              <Escolha
                key={opcao.id}
                rotulo={opcao.nome}
                precoExtra={opcao.preco_adicional}
                esgotado={!opcao.disponivel}
                marcada={(selecionadas[grupo.id] ?? []).includes(opcao.id)}
                corTexto={corTexto}
                corFundo={corFundo}
                aoTocar={() =>
                  alternar(grupo.id, opcao.id, grupo.max_selecao, selecionadas, setSelecionadas)
                }
              />
            ))}
          </Bloco>
        ))}
      </div>

      {/* Fica FORA da area que rola: se estivesse junto das opcoes, o
          cliente que rolou para ver o preco nao leria o aviso. */}
      {escolheuAlgo && quantidade > 1 && (
        <p
          className="border-t-2 px-4 py-3 text-xl font-bold sm:px-6 sm:text-2xl"
          style={{ borderColor: borda, backgroundColor: `${corTexto}12` }}
        >
          O que você escolheu vale para os {quantidade}.{' '}
          <span className="font-normal opacity-70">
            Para um diferente, adicione ele separado.
          </span>
        </p>
      )}

      {/* Barra de baixo: quantidade e confirmacao.
          Em tela estreita eles empilham — lado a lado, o botao ficava
          com uma palavra por linha e o texto virava um bloco ilegivel. */}
      <footer
        className="flex flex-col gap-3 border-t-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-4"
        style={{ borderColor: borda }}
      >
        <div className="flex items-center justify-center gap-3">
          <BotaoQtd
            rotulo="−"
            desabilitado={quantidade <= 1}
            corTexto={corTexto}
            aoTocar={() => setQuantidade((q) => Math.max(1, q - 1))}
          />
          <span className="w-14 text-center text-4xl font-black">{quantidade}</span>
          <BotaoQtd
            rotulo="+"
            desabilitado={quantidade >= 99}
            corTexto={corTexto}
            aoTocar={() => setQuantidade((q) => Math.min(99, q + 1))}
          />
        </div>

        <button
          onClick={confirmar}
          disabled={pendencia !== null}
          className="flex min-h-[76px] flex-1 items-center justify-center gap-3 rounded-2xl px-5 text-2xl font-black disabled:opacity-40 active:enabled:scale-95 sm:justify-between sm:px-8 sm:text-3xl"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          <span>{pendencia ?? 'Adicionar'}</span>
          {!pendencia && <span>{emReais(totalMostrado)}</span>}
        </button>
      </footer>
    </div>
  )
}

// ------------------------------------------------------------
function Bloco({ titulo, obrigatorio, limite, corTexto, corFundo, children }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-bold">{titulo}</h2>
        {obrigatorio && (
          <span
            className="rounded-full px-3 py-1 text-lg font-bold"
            style={{ backgroundColor: corTexto, color: corFundo }}
          >
            Obrigatório
          </span>
        )}
        {limite > 1 && <span className="text-xl opacity-60">escolha até {limite}</span>}
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">{children}</ul>
    </section>
  )
}

function Escolha({ rotulo, precoExtra, esgotado, marcada, corTexto, corFundo, aoTocar }) {
  const extra = Number(precoExtra) || 0

  return (
    <li>
      <button
        onClick={aoTocar}
        disabled={esgotado}
        className={`flex min-h-[76px] w-full items-center justify-between gap-3 rounded-2xl border-4 px-5 py-3 text-left text-2xl font-bold ${
          esgotado ? 'opacity-40' : 'active:scale-95'
        }`}
        style={
          marcada
            ? { backgroundColor: corTexto, color: corFundo, borderColor: corTexto }
            : { borderColor: `${corTexto}33` }
        }
      >
        <span>{rotulo}</span>
        <span className="shrink-0 text-xl opacity-80">
          {esgotado ? 'Esgotado' : extra > 0 ? `+ ${emReais(extra)}` : ''}
        </span>
      </button>
    </li>
  )
}

function BotaoQtd({ rotulo, desabilitado, corTexto, aoTocar }) {
  return (
    <button
      onClick={aoTocar}
      disabled={desabilitado}
      className="h-[76px] w-[76px] rounded-2xl border-4 text-4xl font-black disabled:opacity-30 active:enabled:scale-95"
      style={{ borderColor: corTexto }}
    >
      {rotulo}
    </button>
  )
}

function Recado({ texto, corTexto, corFundo, aoVoltar }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <p className="text-5xl font-bold">{texto}</p>
      {aoVoltar && (
        <button
          onClick={aoVoltar}
          className="min-h-[60px] rounded-2xl border-4 px-10 py-4 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          Voltar
        </button>
      )}
    </div>
  )
}
