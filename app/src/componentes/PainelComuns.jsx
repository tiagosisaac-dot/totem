// ============================================================
// PECAS COMPARTILHADAS pela cozinha e pelo balcao
//
// O cartao de pedido e as telas de recado sao iguais nos dois
// lugares. So o botao muda.
// ============================================================

import Login from './Login.jsx'
import { sair } from '../lib/sessao.js'

// Unica cor do projeto que nao vem do banco. Nao e identidade
// visual da loja, e sinal de atencao numa tela interna — uma loja
// de tema vermelho nao pode fazer o alerta desaparecer.
export const ALERTA = '#C81E1E'

// ------------------------------------------------------------
// Devolve a tela que deve aparecer NO LUGAR do painel, ou null se
// estiver tudo certo para mostrar o painel.
// ------------------------------------------------------------
export function bloqueioDoPainel(painel, titulo) {
  const { carregandoSessao, loja, sessao, acesso, corTexto, corFundo } = painel

  if (carregandoSessao || !loja) {
    return <Recado texto="Carregando..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (!sessao) {
    return <Login titulo={`${titulo} — ${loja.nome}`} corTexto={corTexto} corFundo={corFundo} />
  }

  if (acesso === 'verificando') {
    return <Recado texto="Verificando acesso..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (acesso === 'negado') {
    return (
      <Recado
        texto="Sem acesso a esta loja"
        detalhe="Este usuário pertence a outro estabelecimento."
        corTexto={corTexto}
        corFundo={corFundo}
        aoSair={sair}
      />
    )
  }

  return null
}

// ------------------------------------------------------------
export function Cabecalho({ titulo, loja, corTexto, children }) {
  return (
    <header
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 px-6 py-3"
      style={{ borderColor: `${corTexto}22` }}
    >
      <h1 className="text-3xl font-black">{titulo}</h1>
      <span className="text-2xl opacity-60">{loja.nome}</span>
      {children}
      <button
        onClick={sair}
        className="min-h-[52px] rounded-xl border-4 px-5 text-xl font-bold active:scale-95"
        style={{ borderColor: `${corTexto}44` }}
      >
        Sair
      </button>
    </header>
  )
}

// ------------------------------------------------------------
export function CartaoPedido({ pedido, agora, corTexto, corFundo, destacado, rotulo, aoTocar }) {
  const minutos = Math.max(0, Math.floor((agora - new Date(pedido.criado_em).getTime()) / 60000))

  // itens do combo aparecem embaixo do combo, nao soltos na lista
  const principais = pedido.pedido_itens.filter((i) => !i.combo_pai_id)
  const filhosDe = (id) => pedido.pedido_itens.filter((i) => i.combo_pai_id === id)

  return (
    <li>
      <article
        className="flex h-full flex-col gap-3 rounded-3xl border-4 p-4"
        style={{ borderColor: destacado ? corTexto : `${corTexto}33` }}
      >
        <div className="flex items-start gap-4">
          <div
            className="rounded-2xl px-5 py-2 text-center leading-none"
            style={{ backgroundColor: corTexto, color: corFundo }}
          >
            <p className="text-lg font-bold opacity-80">MESA</p>
            <p className="text-7xl font-black">{pedido.mesa_numero}</p>
          </div>
          <p className="ml-auto text-2xl font-bold">{minutos} min</p>
        </div>

        {/* alguem tentou usar este numero com a plaquinha ainda fora:
            ou erro de digitacao, ou a plaquinha voltou sem ninguem marcar */}
        {pedido.alerta_reuso_em && (
          <p
            className="rounded-xl px-4 py-3 text-lg font-bold text-white"
            style={{ backgroundColor: ALERTA }}
          >
            Outro cliente tentou usar esta mesa. Confira a plaquinha.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {principais.map((item) => (
            <li key={item.id}>
              <p className="text-2xl font-bold leading-tight">
                {item.quantidade}× {item.nome_snap}
              </p>
              {item.pedido_item_opcoes.length > 0 && (
                <p className="text-xl opacity-70">
                  {item.pedido_item_opcoes.map((o) => o.nome_snap).join(' • ')}
                </p>
              )}
              {filhosDe(item.id).map((filho) => (
                <p key={filho.id} className="pl-5 text-xl opacity-80">
                  → {filho.nome_snap}
                </p>
              ))}
            </li>
          ))}
        </ul>

        <button
          onClick={aoTocar}
          className="mt-auto min-h-[68px] rounded-2xl text-2xl font-black active:scale-95"
          style={
            destacado
              ? { backgroundColor: corTexto, color: corFundo }
              : { border: `4px solid ${corTexto}` }
          }
        >
          {rotulo}
        </button>
      </article>
    </li>
  )
}

// ------------------------------------------------------------
export function Recado({ texto, detalhe, corTexto, corFundo, aoSair }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <p className="text-4xl font-bold">{texto}</p>
      {detalhe && <p className="text-2xl opacity-70">{detalhe}</p>}
      {aoSair && (
        <button
          onClick={aoSair}
          className="mt-4 min-h-[60px] rounded-2xl border-4 px-10 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          Sair
        </button>
      )}
    </div>
  )
}
