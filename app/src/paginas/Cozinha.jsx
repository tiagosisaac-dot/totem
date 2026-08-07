// ============================================================
// COZINHA — só o que está sendo produzido
//
// UM botão, "Pronto", e o pedido SOME desta tela. Mão engordurada
// não volta na tela, e em casa cheia duas listas parecidas viram
// pedido marcado errado.
//
// O que ficou pronto passa a existir no balcão (/:slug/balcao).
// ============================================================

import { useParams } from 'react-router-dom'
import { usePainel } from '../lib/usePainel.js'
import { bloqueioDoPainel, Cabecalho, CartaoPedido } from '../componentes/PainelComuns.jsx'

export default function Cozinha() {
  const { slug } = useParams()
  const painel = usePainel(slug)

  const bloqueio = bloqueioDoPainel(painel, 'Cozinha')
  if (bloqueio) return bloqueio

  const { loja, pedidos, agora, atualizar, corTexto, corFundo } = painel

  const produzindo = pedidos.filter(
    (p) => p.status === 'aguardando_pagamento' || p.status === 'em_producao',
  )

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <Cabecalho titulo="Cozinha" loja={loja} corTexto={corTexto}>
        <span className="ml-auto text-2xl font-bold">
          {produzindo.length} {produzindo.length === 1 ? 'pedido' : 'pedidos'}
        </span>
      </Cabecalho>

      <main className="min-h-0 flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: 'contain' }}>
        {produzindo.length === 0 ? (
          <p className="mt-16 text-center text-4xl opacity-50">Nenhum pedido para produzir.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {produzindo.map((pedido) => (
              <CartaoPedido
                key={pedido.id}
                pedido={pedido}
                agora={agora}
                corTexto={corTexto}
                corFundo={corFundo}
                rotulo="Pronto"
                aoTocar={() =>
                  atualizar(pedido, { status: 'pronto', pronto_em: new Date().toISOString() }, true)
                }
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
