// ============================================================
// BALCÃO — a tela do garçom
//
// Duas coisas, nesta ordem de urgência:
//
//   1. PRONTOS PARA LEVAR — prato esperando na passagem
//   2. AGUARDANDO DEVOLUÇÃO — plaquinha que ainda não voltou
//
// "Entregue" e "devolvida" são separados de propósito: o prato sai
// e a plaquinha continua na mesa do cliente. É a devolução que
// libera o número para outro cliente, não a entrega.
//
// O contador de plaquinhas livres fica aqui (e não na cozinha)
// porque é o garçom quem recolhe.
// ============================================================

import { useParams } from 'react-router-dom'
import { usePainel } from '../lib/usePainel.js'
import { ALERTA, bloqueioDoPainel, Cabecalho, LinhaPedido } from '../componentes/PainelComuns.jsx'

// abaixo disso o contador fica vermelho: hora de sair recolhendo
const POUCAS_PLAQUINHAS = 5

export default function Balcao() {
  const { slug } = useParams()
  const painel = usePainel(slug)

  const bloqueio = bloqueioDoPainel(painel, 'Balcão')
  if (bloqueio) return bloqueio

  const { loja, pedidos, agora, atualizar, totalPlaquinhas, corTexto, corFundo } = painel

  const prontos = pedidos.filter((p) => p.status === 'pronto')
  const aguardandoDevolucao = pedidos.filter((p) => p.status === 'entregue')

  const disponiveis = totalPlaquinhas === null ? null : totalPlaquinhas - pedidos.length
  const acabando = disponiveis !== null && disponiveis <= POUCAS_PLAQUINHAS

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <Cabecalho titulo="Balcão" loja={loja} corTexto={corTexto}>
        {/* Ver quantas sobraram evita a equipe descobrir que acabaram
            na hora em que o totem recusa um cliente. */}
        {disponiveis !== null && (
          <span
            className="ml-auto rounded-xl px-4 py-2 text-2xl font-black"
            style={
              acabando
                ? { backgroundColor: ALERTA, color: '#FFFFFF' }
                : { border: `3px solid ${corTexto}33` }
            }
          >
            {disponiveis} de {totalPlaquinhas} plaquinhas livres
          </span>
        )}
      </Cabecalho>

      <main className="min-h-0 flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: 'contain' }}>
        {prontos.length === 0 && aguardandoDevolucao.length === 0 && (
          <p className="mt-16 text-center text-4xl opacity-50">Nada esperando no balcão.</p>
        )}

        {prontos.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-2xl font-black">Prontos para levar ({prontos.length})</h2>
            <ul className="flex flex-col gap-4">
              {prontos.map((pedido) => (
                <LinhaPedido
                  key={pedido.id}
                  pedido={pedido}
                  agora={agora}
                  corTexto={corTexto}
                  corFundo={corFundo}
                  destacado
                  rotulo="Entregue"
                  aoTocar={() =>
                    atualizar(
                      pedido,
                      { status: 'entregue', entregue_em: new Date().toISOString() },
                      false,
                    )
                  }
                />
              ))}
            </ul>
          </section>
        )}

        {/* Compacto de propósito: o pedido já saiu, a única informação
            útil aqui é qual plaquinha falta voltar para a pilha. */}
        {aguardandoDevolucao.length > 0 && (
          <section>
            <h2 className="mb-3 text-2xl font-black" style={{ color: ALERTA }}>
              Aguardando devolução da plaquinha ({aguardandoDevolucao.length})
            </h2>
            <ul className="flex flex-wrap gap-3">
              {aguardandoDevolucao.map((pedido) => (
                <li key={pedido.id}>
                  <button
                    onClick={() =>
                      atualizar(
                        pedido,
                        { plaquinha_devolvida_em: new Date().toISOString() },
                        true,
                      )
                    }
                    className="flex min-h-[76px] items-center gap-3 rounded-2xl px-5 text-white active:scale-95"
                    style={{ backgroundColor: ALERTA }}
                  >
                    <span className="text-4xl font-black">{pedido.mesa_numero}</span>
                    <span className="text-xl font-bold">Devolvida</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
