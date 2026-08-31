// ============================================================
// PECAS COMPARTILHADAS pelas telas internas (admin, impressora)
//
// Login/acesso e as telas de recado sao iguais em todas elas.
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
