// ============================================================
// NUMERO DA MESA — ultima etapa do pedido
//
// O cliente digita o numero da plaquinha que pegou ao lado do
// totem. E a identificacao do pedido: o garcom procura essa
// plaquinha na mesa, e o caixa cobra por ela.
//
// Confirmacao explicita antes de enviar. Mesa errada significa
// comida entregue na mesa errada — vale um toque a mais.
// ============================================================

import { useEffect, useState } from 'react'
import { enviarPedido } from '../lib/pedidos.js'
import { emReais } from '../lib/formato.js'

const MAX_DIGITOS = 3
const SEGUNDOS_ATE_VOLTAR = 15

export default function NumeroMesa({
  slug,
  carrinho,
  corTexto,
  corFundo,
  aoVoltar,
  aoConcluir,
}) {
  const [digitado, setDigitado] = useState('')
  const [etapa, setEtapa] = useState('digitando')
  const [erro, setErro] = useState(null)
  const [pedido, setPedido] = useState(null)

  const total = carrinho.reduce((soma, item) => soma + item.totalMostrado, 0)
  const borda = `${corTexto}22`

  // Depois de enviado, volta sozinho para a tela inicial: o proximo
  // cliente nao pode encontrar o pedido do anterior na tela.
  useEffect(() => {
    if (etapa !== 'enviado') return
    const relogio = setTimeout(aoConcluir, SEGUNDOS_ATE_VOLTAR * 1000)
    return () => clearTimeout(relogio)
  }, [etapa, aoConcluir])

  function digitar(numero) {
    setDigitado((atual) => (atual.length >= MAX_DIGITOS ? atual : atual + numero))
  }

  async function enviar() {
    setEtapa('enviando')
    setErro(null)

    const resultado = await enviarPedido({
      slug,
      mesaNumero: Number(digitado),
      carrinho,
    })

    if (!resultado.ok) {
      // NUNCA limpar o carrinho aqui: o cliente vai querer tentar
      // outro numero, nao refazer o pedido inteiro.
      setErro(resultado.mensagem)
      setEtapa('digitando')
      setDigitado('')
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
          <p className="text-3xl font-bold opacity-80">Mesa</p>
          <p className="text-9xl font-black leading-none">{pedido.mesa_numero}</p>
        </div>

        <p className="text-4xl font-bold">Pague no caixa</p>
        <p className="text-2xl opacity-70">Deixe a plaquinha na mesa.</p>

        <button
          onClick={aoConcluir}
          className="mt-4 min-h-[76px] rounded-2xl border-4 px-12 py-4 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          Concluir
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
  // CONFIRMACAO ("Mesa 17, esta certo?")
  // ----------------------------------------------------------
  if (etapa === 'confirmando') {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center"
        style={{ backgroundColor: corFundo, color: corTexto }}
      >
        <p className="text-4xl font-bold">Confirme o número da mesa</p>

        <p className="text-[10rem] font-black leading-none">{digitado}</p>

        <p className="text-3xl opacity-70">
          Total: <span className="font-black">{emReais(total)}</span>
        </p>

        <div className="mt-4 flex gap-6">
          <button
            onClick={() => setEtapa('digitando')}
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
  // TECLADO
  // ----------------------------------------------------------
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
        <h1 className="text-3xl font-black">Número da mesa</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6">
        {erro && (
          <p
            className="max-w-3xl rounded-2xl px-8 py-5 text-center text-3xl font-bold"
            style={{ backgroundColor: corTexto, color: corFundo }}
          >
            {erro}
          </p>
        )}

        {!erro && (
          <p className="text-3xl font-bold opacity-70">
            Digite o número da plaquinha que você pegou
          </p>
        )}

        <p className="h-[7rem] text-[7rem] font-black leading-none">
          {digitado || <span className="opacity-25">—</span>}
        </p>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((numero) => (
            <Tecla key={numero} corTexto={corTexto} aoTocar={() => digitar(String(numero))}>
              {numero}
            </Tecla>
          ))}

          <Tecla corTexto={corTexto} aoTocar={() => setDigitado('')}>
            limpar
          </Tecla>
          <Tecla corTexto={corTexto} aoTocar={() => digitar('0')}>
            0
          </Tecla>
          <Tecla corTexto={corTexto} aoTocar={() => setDigitado((a) => a.slice(0, -1))}>
            ←
          </Tecla>
        </div>
      </div>

      <footer className="border-t-2 px-6 py-4" style={{ borderColor: borda }}>
        <button
          onClick={() => setEtapa('confirmando')}
          disabled={digitado === '' || Number(digitado) === 0}
          className="min-h-[88px] w-full rounded-2xl text-3xl font-black disabled:opacity-40 active:enabled:scale-95"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          Continuar
        </button>
      </footer>
    </div>
  )
}

function Tecla({ children, corTexto, aoTocar }) {
  return (
    <button
      onClick={aoTocar}
      className="h-[92px] w-[132px] rounded-2xl border-4 text-4xl font-black active:scale-95"
      style={{ borderColor: corTexto }}
    >
      {children}
    </button>
  )
}
