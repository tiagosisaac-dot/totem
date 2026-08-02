// ============================================================
// CARRINHO — revisar antes de informar a mesa
//
// Ultima chance do cliente conferir e tirar algo. Os valores aqui
// sao os mesmos mostrados na tela do produto: VITRINE. O total
// que vale e o que a Edge Function calcular.
// ============================================================

import { emReais } from '../lib/formato.js'

export default function Carrinho({
  carrinho,
  corTexto,
  corFundo,
  aoVoltar,
  aoRemover,
  aoFinalizar,
}) {
  const total = carrinho.reduce((soma, item) => soma + item.totalMostrado, 0)
  const borda = `${corTexto}22`

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <header className="flex items-center gap-4 border-b-2 px-6 py-4" style={{ borderColor: borda }}>
        <button
          onClick={aoVoltar}
          className="min-h-[60px] rounded-xl border-4 px-6 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          ← Adicionar mais
        </button>
        <h1 className="text-3xl font-black">Seu pedido</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
        {carrinho.length === 0 ? (
          <p className="mt-12 text-center text-3xl opacity-60">Seu pedido está vazio.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {carrinho.map((item, indice) => (
              <li
                key={indice}
                className="flex items-start gap-4 rounded-3xl border-4 p-5"
                style={{ borderColor: borda }}
              >
                <span
                  className="shrink-0 rounded-xl px-4 py-2 text-3xl font-black"
                  style={{ backgroundColor: corTexto, color: corFundo }}
                >
                  {item.quantidade}×
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-3xl font-bold">{item.produto.nome}</p>
                  {item.resumo.length > 0 && (
                    <p className="mt-1 text-xl opacity-70">{item.resumo.join(' • ')}</p>
                  )}
                </div>

                <span className="shrink-0 text-3xl font-black">{emReais(item.totalMostrado)}</span>

                {/* alvo de toque grande e afastado do resto: remover
                    por engano no fim do pedido e irritante */}
                <button
                  onClick={() => aoRemover(indice)}
                  aria-label={`Remover ${item.produto.nome}`}
                  className="ml-2 h-[64px] w-[64px] shrink-0 rounded-2xl border-4 text-3xl font-black active:scale-95"
                  style={{ borderColor: corTexto }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center gap-6 border-t-2 px-6 py-4" style={{ borderColor: borda }}>
        <div className="shrink-0">
          <p className="text-xl opacity-60">Total</p>
          <p className="text-4xl font-black">{emReais(total)}</p>
        </div>

        <button
          onClick={aoFinalizar}
          disabled={carrinho.length === 0}
          className="min-h-[76px] flex-1 rounded-2xl px-8 text-3xl font-black disabled:opacity-40 active:enabled:scale-95"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          Finalizar pedido
        </button>
      </footer>
    </div>
  )
}
