// ============================================================
// CARRINHO — revisar antes de informar a mesa
//
// Ultima chance do cliente conferir e tirar algo. Os valores aqui
// sao os mesmos mostrados na tela do produto: VITRINE. O total
// que vale e o que a Edge Function calcular.
// ============================================================

import { emReais } from '../lib/formato.js'
import { ALERTA } from './PainelComuns.jsx'

export default function Carrinho({
  carrinho,
  corTexto,
  corFundo,
  avisoEsgotado,
  aoVoltar,
  aoRemover,
  aoMudarQuantidade,
  aoFinalizar,
}) {
  const total = carrinho.reduce((soma, item) => soma + item.totalMostrado, 0)
  const borda = `${corTexto}22`

  // enquanto houver item esgotado, finalizar so levaria a outra
  // recusa: melhor travar aqui e mostrar o que resolver
  const temEsgotado = carrinho.some((item) => item.esgotado)

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <header
        className="flex flex-wrap items-center gap-3 border-b-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4"
        style={{ borderColor: borda }}
      >
        <button
          onClick={aoVoltar}
          className="min-h-[60px] rounded-xl border-4 px-5 text-xl font-bold active:scale-95 sm:px-6 sm:text-2xl"
          style={{ borderColor: corTexto }}
        >
          ← Adicionar mais
        </button>
        <h1 className="text-2xl font-black sm:text-3xl">Seu pedido</h1>
      </header>

      {avisoEsgotado && (
        <p
          className="px-6 py-5 text-2xl font-bold text-white"
          style={{ backgroundColor: ALERTA }}
          role="alert"
        >
          {avisoEsgotado} Remova o item marcado para continuar.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
        {carrinho.length === 0 ? (
          <p className="mt-12 text-center text-3xl opacity-60">Seu pedido está vazio.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {carrinho.map((item, indice) => (
              <li
                key={indice}
                className="flex flex-wrap items-start gap-3 rounded-3xl border-4 p-4 sm:gap-4 sm:p-5"
                style={{ borderColor: item.esgotado ? ALERTA : borda }}
              >
                {/* Pediu 2 e quer levar 1: e aqui que ele resolve, sem
                    apagar a linha e refazer o pedido do zero.
                    O "−" PARA no 1 em vez de remover. Chegar no zero
                    apagaria a linha com o mesmo toque que estava
                    diminuindo — o cliente pisa uma vez a mais e o item
                    some sem ele entender. Para remover existe o ×. */}
                <div className="flex shrink-0 items-center gap-2">
                  <BotaoQtd
                    rotulo="−"
                    desabilitado={item.quantidade <= 1}
                    corTexto={corTexto}
                    aoTocar={() => aoMudarQuantidade(indice, item.quantidade - 1)}
                    descricao={`Menos um ${item.produto.nome}`}
                  />
                  <span
                    className="w-[58px] rounded-xl py-2 text-center text-2xl font-black sm:w-[68px] sm:text-3xl"
                    style={
                      item.esgotado
                        ? { backgroundColor: ALERTA, color: '#FFFFFF' }
                        : { backgroundColor: corTexto, color: corFundo }
                    }
                  >
                    {item.quantidade}×
                  </span>
                  <BotaoQtd
                    rotulo="+"
                    desabilitado={item.quantidade >= 99}
                    corTexto={corTexto}
                    aoTocar={() => aoMudarQuantidade(indice, item.quantidade + 1)}
                    descricao={`Mais um ${item.produto.nome}`}
                  />
                </div>

                <div className="min-w-[8rem] flex-1">
                  <p className="text-2xl font-bold sm:text-3xl">{item.produto.nome}</p>
                  {item.resumo.length > 0 && (
                    <p className="mt-1 text-xl opacity-70">{item.resumo.join(' • ')}</p>
                  )}
                  {/* motivo especifico: num combo o que esgotou nao e o
                      combo, e o item escolhido dentro dele */}
                  {item.esgotado && (
                    <p className="mt-1 text-xl font-black" style={{ color: ALERTA }}>
                      {item.motivo ?? 'Esgotou'} — remova para continuar
                    </p>
                  )}
                </div>

                <span className="ml-auto shrink-0 text-2xl font-black sm:text-3xl">
                  {emReais(item.totalMostrado)}
                </span>

                {/* alvo de toque grande e afastado do resto: remover
                    por engano no fim do pedido e irritante.
                    Quando o item esgotou, virar o botao de cor faz o
                    cliente achar o que precisa tocar sem procurar. */}
                <button
                  onClick={() => aoRemover(indice)}
                  aria-label={`Remover ${item.produto.nome}`}
                  className="h-[64px] w-[64px] shrink-0 rounded-2xl border-4 text-3xl font-black active:scale-95 sm:ml-2"
                  style={
                    item.esgotado
                      ? { backgroundColor: ALERTA, borderColor: ALERTA, color: '#FFFFFF' }
                      : { borderColor: corTexto }
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer
        className="flex flex-col gap-3 border-t-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-4"
        style={{ borderColor: borda }}
      >
        <div className="flex shrink-0 items-baseline gap-3 sm:block">
          <p className="text-xl opacity-60">Total</p>
          <p className="text-3xl font-black sm:text-4xl">{emReais(total)}</p>
        </div>

        <button
          onClick={aoFinalizar}
          disabled={carrinho.length === 0 || temEsgotado}
          className="min-h-[76px] flex-1 rounded-2xl px-5 text-2xl font-black disabled:opacity-40 active:enabled:scale-95 sm:px-8 sm:text-3xl"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          Finalizar pedido
        </button>
      </footer>
    </div>
  )
}

// ------------------------------------------------------------
// Botao de mais/menos. Menor que o × ao lado (56 contra 64) porque
// mudar a quantidade e reversivel com um toque e remover nao e.
// ------------------------------------------------------------
function BotaoQtd({ rotulo, desabilitado, corTexto, aoTocar, descricao }) {
  return (
    <button
      onClick={aoTocar}
      disabled={desabilitado}
      aria-label={descricao}
      className="h-[56px] w-[56px] shrink-0 rounded-2xl border-4 text-3xl font-black disabled:opacity-30 active:enabled:scale-95"
      style={{ borderColor: corTexto }}
    >
      {rotulo}
    </button>
  )
}
