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
            'ordem, grupos_opcoes!inner(id, nome, tipo, min_selecao, max_selecao, ativo, ' +
              'opcoes(id, nome, preco_adicional, disponivel, ordem))',
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
  // Total de VITRINE (o servidor recalcula — ver aviso no topo)
  // ----------------------------------------------------------
  const totalMostrado = useMemo(() => {
    let unitario = Number(produto.preco) || 0

    for (const grupo of grupos) {
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

    return unitario * quantidade
  }, [produto.preco, grupos, slots, selecionadas, escolhasCombo, quantidade])

  // ----------------------------------------------------------
  // O que ainda falta escolher
  //
  // A mesma checagem existe no servidor. Aqui ela serve para o
  // cliente entender o que falta, nao para garantir nada.
  // ----------------------------------------------------------
  const pendencia = useMemo(() => {
    for (const grupo of grupos) {
      const quantas = (selecionadas[grupo.id] ?? []).length
      if (quantas < grupo.min_selecao) return `Escolha: ${grupo.nome}`
    }
    for (const slot of slots) {
      const quantas = (escolhasCombo[slot.id] ?? []).length
      if (quantas < slot.min_selecao) return `Escolha: ${slot.nome}`
    }
    return null
  }, [grupos, slots, selecionadas, escolhasCombo])

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
    aoAdicionar({
      produto,
      quantidade,
      // ids das opcoes escolhidas, achatados numa lista so —
      // e o formato que a Edge Function espera
      opcoes: Object.values(selecionadas).flat(),
      comboEscolhas: Object.entries(escolhasCombo).flatMap(([slotId, produtos]) =>
        produtos.map((produtoId) => ({ slot_id: slotId, produto_id: produtoId })),
      ),
    })
  }

  const borda = `${corTexto}22`

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <header className="flex items-center gap-4 border-b-2 px-6 py-4" style={{ borderColor: borda }}>
        <button
          onClick={aoVoltar}
          className="min-h-[60px] rounded-xl border-4 px-6 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          ← Voltar
        </button>
        <h1 className="truncate text-3xl font-black">{produto.nome}</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
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

        {/* adicionais, remocoes e escolhas */}
        {grupos.map((grupo) => (
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

      {/* barra de baixo: quantidade e confirmacao */}
      <footer className="flex items-center gap-6 border-t-2 px-6 py-4" style={{ borderColor: borda }}>
        <div className="flex items-center gap-3">
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
          className="flex min-h-[76px] flex-1 items-center justify-between rounded-2xl px-8 text-3xl font-black disabled:opacity-40 active:enabled:scale-95"
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
      <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">{children}</ul>
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
