// ============================================================
// QUEM ESTA LOGADO, E EM QUAL LOJA
//
// Compartilhado por cozinha, balcao e painel do dono. Cada uma
// dessas telas precisa das mesmas tres respostas:
//   1. qual e a loja deste endereco?
//   2. tem alguem logado?
//   3. essa pessoa pertence A ESTA loja, e com qual papel?
//
// A pergunta 3 existe por causa da REGRA 6: sem conferir, o painel
// de outra loja abriria vazio por causa das policies e pareceria
// bug de codigo.
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSessao } from './sessao.js'

export function useLojaLogada(slug) {
  const { sessao, carregando: carregandoSessao } = useSessao()

  const [loja, setLoja] = useState(null)
  const [papel, setPapel] = useState(null)
  const [acesso, setAcesso] = useState('verificando')

  useEffect(() => {
    let cancelado = false

    supabase
      .from('estabelecimentos')
      .select('id, nome, fuso, cor_primaria, cor_secundaria, aceita_pedidos')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) setLoja(data)
      })

    return () => {
      cancelado = true
    }
  }, [slug])

  useEffect(() => {
    if (!sessao || !loja) return
    let cancelado = false

    supabase
      .from('perfis')
      .select('estabelecimento_id, papel')
      .eq('user_id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        setPapel(data?.papel ?? null)
        setAcesso(data?.estabelecimento_id === loja.id ? 'liberado' : 'negado')
      })

    return () => {
      cancelado = true
    }
  }, [sessao, loja])

  return {
    sessao,
    carregandoSessao,
    loja,
    papel,
    acesso,
    corTexto: loja?.cor_primaria || '#111111',
    corFundo: loja?.cor_secundaria || '#F5F5F5',
  }
}
