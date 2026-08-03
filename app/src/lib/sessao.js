// ============================================================
// SESSAO — quem esta logado agora
//
// O supabase-js guarda a sessao no navegador e avisa sempre que
// ela muda (login, logout, token renovado). Este hook so escuta
// esse aviso e devolve o estado atual.
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export function useSessao() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false

    // sessao que ja estava salva (a pessoa recarregou a pagina)
    supabase.auth.getSession().then(({ data }) => {
      if (cancelado) return
      setSessao(data.session)
      setCarregando(false)
    })

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      setCarregando(false)
    })

    return () => {
      cancelado = true
      assinatura.subscription.unsubscribe()
    }
  }, [])

  return { sessao, carregando }
}

export async function sair() {
  await supabase.auth.signOut()
}
