// ============================================================
// IDENTIFICACAO DO PEDIDO — ultima etapa, no lugar da mesa
//
// Sem mesa, sem plaquinha: o cliente digita o proprio nome e
// escolhe comer no local ou levar. E isso que identifica o pedido
// na cozinha (no cupom impresso) e no caixa.
//
// Confirmacao explicita antes de enviar, mesma regra de sempre —
// nome errado ou tipo trocado so se descobre tarde demais.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { enviarPedido } from '../lib/pedidos.js'
import { emReais } from '../lib/formato.js'

const MAX_CARACTERES_NOME = 60

// Tempo da tela de "pedido enviado" ate voltar sozinha ao inicio.
// Mesmo valor de sempre (nao mexe: e o timer separado do de
// inatividade geral, decidido assim em 29/08/2026).
const SEGUNDOS_ATE_VOLTAR = 5

export default function IdentificacaoPedido({
  slug,
  carrinho,
  corTexto,
  corFundo,
  aoVoltar,
  aoOcupado,
  aoItemEsgotado,
  aoConcluir,
}) {
  const [nome, setNome] = useState('')
  const [tipoConsumo, setTipoConsumo] = useState(null)
  const [etapa, setEtapa] = useState('preenchendo')
  const [erro, setErro] = useState(null)
  const [pedido, setPedido] = useState(null)
  const [restam, setRestam] = useState(SEGUNDOS_ATE_VOLTAR)
  const fecharEm = useRef(null)

  // Avisa o totem para PARAR o relogio de inatividade enquanto o
  // pedido esta indo (ou acabou de ir).
  useEffect(() => {
    aoOcupado?.(etapa === 'enviando' || etapa === 'enviado')
  }, [etapa, aoOcupado])

  const total = carrinho.reduce((soma, item) => soma + item.totalMostrado, 0)
  const borda = `${corTexto}22`

  // Depois de enviado, volta sozinho para a tela inicial.
  useEffect(() => {
    if (etapa !== 'enviado') return

    if (fecharEm.current === null) {
      fecharEm.current = Date.now() + SEGUNDOS_ATE_VOLTAR * 1000
    }

    function conferir() {
      const faltam = Math.ceil((fecharEm.current - Date.now()) / 1000)
      if (faltam <= 0) {
        setRestam(0)
        aoConcluir()
        return true
      }
      setRestam(faltam)
      return false
    }

    conferir()
    const relogio = setInterval(() => {
      if (conferir()) clearInterval(relogio)
    }, 250)

    return () => clearInterval(relogio)
  }, [etapa, aoConcluir])

  async function enviar() {
    setEtapa('enviando')
    setErro(null)

    const resultado = await enviarPedido({
      slug,
      nomeCliente: nome.trim(),
      tipoConsumo,
      carrinho,
    })

    if (!resultado.ok) {
      // Item esgotou no meio do pedido: manda o cliente de volta ao
      // carrinho, o problema nao esta no nome nem no tipo de consumo.
      if (resultado.codigo === 'item_esgotado') {
        aoItemEsgotado?.(resultado.itens, resultado.mensagem)
        return
      }

      setErro(resultado.mensagem)
      setEtapa('preenchendo')
      return
    }

    setPedido(resultado.pedido)
    setEtapa('enviado')
  }

  // ----------------------------------------------------------
  // PEDIDO ENVIADO
  // ----------------------------------------------------------
  if (etapa === 'enviado') {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center"
        style={{ backgroundColor: corFundo, color: corTexto }}
      >
        <p className="text-5xl font-bold">Pedido enviado!</p>

        <div className="rounded-3xl px-16 py-8" style={{ backgroundColor: corTexto, color: corFundo }}>
          <p className="text-3xl font-bold opacity-80">
            {pedido.tipo_consumo === 'levar' ? 'Para levar' : 'Comer aqui'}
          </p>
          <p className="text-[clamp(2.5rem,10vh,6rem)] font-black leading-none">
            {pedido.nome_cliente}
          </p>
        </div>

        <p className="text-4xl font-bold">Pague no caixa</p>

        <button
          onClick={aoConcluir}
          className="mt-4 min-h-[76px] rounded-2xl px-16 py-4 text-3xl font-black active:scale-95"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          Concluir ({restam})
        </button>
      </div>
    )
  }

  // ----------------------------------------------------------
  // ENVIANDO
  // ----------------------------------------------------------
  if (etapa === 'enviando') {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center"
        style={{ backgroundColor: corFundo, color: corTexto }}
      >
        <p className="animate-pulse text-5xl font-bold">Enviando seu pedido...</p>
        <p className="text-2xl opacity-70">Não saia desta tela.</p>
      </div>
    )
  }

  // ----------------------------------------------------------
  // CONFIRMACAO
  // ----------------------------------------------------------
  if (etapa === 'confirmando') {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center"
        style={{ backgroundColor: corFundo, color: corTexto }}
      >
        <p className="text-4xl font-bold">Confirme seu pedido</p>

        <p className="text-[clamp(2rem,8vh,4rem)] font-black leading-tight">{nome}</p>
        <p className="text-2xl font-bold opacity-80">
          {tipoConsumo === 'levar' ? 'Para levar' : 'Comer aqui'}
        </p>

        <p className="text-3xl opacity-70">
          Total: <span className="font-black">{emReais(total)}</span>
        </p>

        <div className="mt-4 flex gap-6">
          <button
            onClick={() => setEtapa('preenchendo')}
            className="min-h-[88px] rounded-2xl border-4 px-12 text-3xl font-bold active:scale-95"
            style={{ borderColor: corTexto }}
          >
            Corrigir
          </button>
          <button
            onClick={enviar}
            className="min-h-[88px] rounded-2xl px-16 text-3xl font-black active:scale-95"
            style={{ backgroundColor: corTexto, color: corFundo }}
          >
            Sim, enviar
          </button>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  // PREENCHENDO — tipo de consumo + nome
  // ----------------------------------------------------------
  const podeContinuar = tipoConsumo !== null && nome.trim() !== ''

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <header
        className="flex items-center gap-4 border-b-2 px-6 py-[1.5vh]"
        style={{ borderColor: borda }}
      >
        <button
          onClick={aoVoltar}
          className="min-h-[60px] rounded-xl border-4 px-6 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          ← Voltar
        </button>
        <h1 className="text-[clamp(1.5rem,4vh,1.875rem)] font-black">Finalizar pedido</h1>
      </header>

      {/* Rolagem de seguranca, mesmo motivo do teclado de mesa antigo:
          centralizar sem isso transborda em tela baixa. */}
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        <div className="flex min-h-full flex-col items-center justify-center gap-[2vh] p-3 sm:p-6">
          {erro && (
            <p
              className="max-w-3xl rounded-2xl px-8 py-5 text-center text-2xl font-bold"
              style={{ backgroundColor: corTexto, color: corFundo }}
            >
              {erro}
            </p>
          )}

          <p className="text-center text-[clamp(1.25rem,3.5vh,1.875rem)] font-bold opacity-70">
            Vai comer aqui ou levar?
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setTipoConsumo('local')}
              className="min-h-[88px] min-w-[220px] rounded-2xl border-4 px-8 text-2xl font-black active:scale-95"
              style={
                tipoConsumo === 'local'
                  ? { backgroundColor: corTexto, color: corFundo, borderColor: corTexto }
                  : { borderColor: corTexto }
              }
            >
              Comer aqui
            </button>
            <button
              onClick={() => setTipoConsumo('levar')}
              className="min-h-[88px] min-w-[220px] rounded-2xl border-4 px-8 text-2xl font-black active:scale-95"
              style={
                tipoConsumo === 'levar'
                  ? { backgroundColor: corTexto, color: corFundo, borderColor: corTexto }
                  : { borderColor: corTexto }
              }
            >
              Para levar
            </button>
          </div>

          <p className="mt-[2vh] text-center text-[clamp(1.25rem,3.5vh,1.875rem)] font-bold opacity-70">
            Qual é o seu nome?
          </p>

          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value.slice(0, MAX_CARACTERES_NOME))}
            placeholder="Digite seu nome"
            autoCapitalize="words"
            className="w-full max-w-xl rounded-2xl border-4 bg-transparent px-6 py-4 text-center text-4xl font-black outline-none"
            style={{ borderColor: corTexto, color: corTexto }}
          />

          <p className="text-3xl opacity-70">
            Total: <span className="font-black">{emReais(total)}</span>
          </p>
        </div>
      </div>

      <footer className="border-t-2 px-6 py-[1.5vh]" style={{ borderColor: borda }}>
        <button
          onClick={() => setEtapa('confirmando')}
          disabled={!podeContinuar}
          className="min-h-[clamp(60px,10vh,88px)] w-full rounded-2xl text-[clamp(1.5rem,4vh,1.875rem)] font-black disabled:opacity-40 active:enabled:scale-95"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          Continuar
        </button>
      </footer>
    </div>
  )
}
