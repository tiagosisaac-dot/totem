// ============================================================
// CARDAPIO — categorias na lateral, produtos na area principal
//
// Nao busca dados: recebe o cardapio ja carregado e AO VIVO (ver
// lib/useCardapio.js). O motivo de morar la fora e o carrinho, que
// tambem precisa saber quando um item esgota.
// ============================================================

import { useState } from 'react'
import { emReais } from '../lib/formato.js'

export default function Cardapio({
  loja,
  estado,
  categorias,
  produtos,
  corTexto,
  corFundo,
  carrinho = [],
  aoVoltar,
  aoVerPedido,
  aoEscolherProduto,
}) {
  // null = ainda nao escolheu; cai na primeira categoria.
  // Guardar a escolha aqui faz o cliente NAO ser jogado para outra
  // categoria quando o cardapio se atualiza no meio da navegacao.
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(null)
  const categoriaAtual = categoriaEscolhida ?? categorias[0]?.id ?? null
  const setCategoriaAtual = setCategoriaEscolhida

  if (estado === 'carregando') {
    return <Recado texto="Carregando o cardápio..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (estado === 'erro') {
    return (
      <Recado
        texto="Não foi possível carregar o cardápio"
        detalhe="Faça seu pedido no caixa."
        corTexto={corTexto}
        corFundo={corFundo}
        aoVoltar={aoVoltar}
      />
    )
  }

  if (categorias.length === 0) {
    return (
      <Recado
        texto="Cardápio indisponível"
        detalhe="Faça seu pedido no caixa."
        corTexto={corTexto}
        corFundo={corFundo}
        aoVoltar={aoVoltar}
      />
    )
  }

  // vendavel_sozinho: produto que so existe dentro de combo nao
  // aparece avulso. Ele vem na lista porque o carrinho precisa dele.
  const produtosDaCategoria = produtos.filter(
    (p) => p.vendavel_sozinho && p.categoria_id === categoriaAtual,
  )
  const itensNoCarrinho = carrinho.reduce((soma, item) => soma + item.quantidade, 0)

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      {/* barra de cima */}
      <header className="flex items-center gap-4 border-b-2 px-6 py-4" style={{ borderColor: `${corTexto}22` }}>
        <button
          onClick={aoVoltar}
          className="min-h-[60px] rounded-xl border-4 px-6 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          ← Início
        </button>
        <h1 className="text-3xl font-black">{loja.nome}</h1>

        {itensNoCarrinho > 0 && (
          <button
            onClick={aoVerPedido}
            className="ml-auto min-h-[60px] rounded-2xl px-6 py-3 text-2xl font-black active:scale-95"
            style={{ backgroundColor: corTexto, color: corFundo }}
          >
            Ver pedido ({itensNoCarrinho})
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* categorias */}
        <nav className="w-72 shrink-0 overflow-y-auto border-r-2 p-4" style={{ borderColor: `${corTexto}22` }}>
          <ul className="flex flex-col gap-3">
            {categorias.map((categoria) => {
              const ativa = categoria.id === categoriaAtual
              return (
                <li key={categoria.id}>
                  <button
                    onClick={() => setCategoriaAtual(categoria.id)}
                    className="min-h-[72px] w-full rounded-2xl px-4 py-3 text-left text-2xl font-bold active:scale-95"
                    style={
                      ativa
                        ? { backgroundColor: corTexto, color: corFundo }
                        : { border: `3px solid ${corTexto}33` }
                    }
                  >
                    {categoria.nome}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* produtos */}
        <main className="min-h-0 flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
          {produtosDaCategoria.length === 0 ? (
            <p className="mt-12 text-center text-3xl opacity-60">Nada nesta categoria por enquanto.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-6 xl:grid-cols-3">
              {produtosDaCategoria.map((produto) => (
                <li key={produto.id}>
                  <CartaoProduto
                    produto={produto}
                    corTexto={corTexto}
                    corFundo={corFundo}
                    aoEscolher={() => aoEscolherProduto(produto)}
                  />
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Cartao de produto
//
// Esgotado continua na tela, apagado e sem clique: se sumisse, o
// cliente perguntaria "nao tem?" para alguem do salao — que e o
// trabalho que o totem existe para tirar do dono.
// ------------------------------------------------------------
function CartaoProduto({ produto, corTexto, corFundo, aoEscolher }) {
  const esgotado = !produto.disponivel

  return (
    <button
      onClick={aoEscolher}
      disabled={esgotado}
      className={`flex h-full w-full flex-col overflow-hidden rounded-3xl border-4 text-left ${
        esgotado ? 'opacity-40' : 'active:scale-95'
      }`}
      style={{ borderColor: `${corTexto}22` }}
    >
      <div
        className="relative flex aspect-4/3 w-full items-center justify-center"
        style={{ backgroundColor: `${corTexto}0f` }}
      >
        {produto.imagem_url ? (
          <img src={produto.imagem_url} alt="" className="h-full w-full object-cover" />
        ) : (
          // sem foto cadastrada: inicial do produto no lugar
          <span className="text-6xl font-black opacity-25">{produto.nome.charAt(0)}</span>
        )}

        {esgotado && (
          <span
            className="absolute bottom-3 left-3 rounded-full px-4 py-2 text-xl font-bold"
            style={{ backgroundColor: corTexto, color: corFundo }}
          >
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-2xl font-bold leading-tight">{produto.nome}</p>
        {produto.descricao && <p className="text-lg opacity-60">{produto.descricao}</p>}
        <p className="mt-auto pt-2 text-3xl font-black">{emReais(produto.preco)}</p>
      </div>
    </button>
  )
}

function Recado({ texto, detalhe, corTexto, corFundo, aoVoltar }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <p className="text-5xl font-bold">{texto}</p>
      {detalhe && <p className="text-3xl opacity-70">{detalhe}</p>}
      {aoVoltar && (
        <button
          onClick={aoVoltar}
          className="mt-4 min-h-[60px] rounded-2xl border-4 px-10 py-4 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          Voltar
        </button>
      )}
    </div>
  )
}
