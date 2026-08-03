// ============================================================
// INATIVIDADE — o cliente que desiste no meio e vai embora
//
// Sem isso, o carrinho dele fica na tela e o proximo cliente pode
// adicionar os itens em cima e pagar pelos dois.
//
// Avisa antes de apagar, nunca apaga direto: alguem lendo o
// cardapio com calma nao pode perder o pedido montado.
//
// Conta pelo RELOGIO (guarda o instante do ultimo toque) em vez de
// contar disparos do cronometro. Navegador desacelera cronometro de
// aba em segundo plano; o relogio nao mente.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'

const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart']

export function useInatividade({ ativo, segundosAteAvisar, segundosDoAviso, aoExpirar }) {
  const [avisando, setAvisando] = useState(false)
  const [restam, setRestam] = useState(segundosDoAviso)
  const ultimoToque = useRef(Date.now())

  const registrarAtividade = useCallback(() => {
    ultimoToque.current = Date.now()
  }, [])

  useEffect(() => {
    EVENTOS.forEach((evento) =>
      window.addEventListener(evento, registrarAtividade, { passive: true }),
    )
    return () =>
      EVENTOS.forEach((evento) => window.removeEventListener(evento, registrarAtividade))
  }, [registrarAtividade])

  useEffect(() => {
    // Zera SEMPRE que a contagem liga ou desliga.
    //
    // Sem isso, o relogio "acorda" contando o tempo em que o totem
    // ficou parado na tela inicial, e o primeiro cliente do dia
    // levaria o aviso de inatividade nos primeiros segundos.
    ultimoToque.current = Date.now()
    setAvisando(false)

    if (!ativo) return

    const relogio = setInterval(() => {
      const parado = (Date.now() - ultimoToque.current) / 1000

      if (parado >= segundosAteAvisar + segundosDoAviso) {
        setAvisando(false)
        aoExpirar()
      } else if (parado >= segundosAteAvisar) {
        setAvisando(true)
        setRestam(Math.ceil(segundosAteAvisar + segundosDoAviso - parado))
      } else {
        setAvisando(false)
      }
    }, 500)

    return () => clearInterval(relogio)
  }, [ativo, segundosAteAvisar, segundosDoAviso, aoExpirar])

  return { avisando, restam, continuar: registrarAtividade }
}
