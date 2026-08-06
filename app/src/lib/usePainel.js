// ============================================================
// PAINEL — o que a cozinha e o balcao compartilham
//
// Em cima de useLojaLogada (quem esta logado e em qual loja), este
// hook acrescenta o que so essas duas telas precisam: os pedidos
// com a plaquinha fora e o tempo real.
//
// O painel do dono NAO usa este hook: ele nao precisa de pedidos
// nem de assinatura de tempo real.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useLojaLogada } from './useLojaLogada.js'

export function usePainel(slug) {
  const base = useLojaLogada(slug)
  const { loja, acesso } = base

  const [totalPlaquinhas, setTotalPlaquinhas] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [agora, setAgora] = useState(Date.now())

  // relogio para o "ha X min" nao congelar na tela
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 20000)
    return () => clearInterval(relogio)
  }, [])

  useEffect(() => {
    if (!loja) return
    let cancelado = false

    supabase
      .from('mesas')
      .select('numero', { count: 'exact', head: true })
      .eq('estabelecimento_id', loja.id)
      .eq('ativa', true)
      .then(({ count }) => {
        if (!cancelado) setTotalPlaquinhas(count)
      })

    return () => {
      cancelado = true
    }
  }, [loja])

  const carregarPedidos = useCallback(async () => {
    if (!loja) return

    // Tudo que ainda esta com a plaquinha fora, inclusive ja entregue
    const { data, error } = await supabase
      .from('pedidos')
      .select(
        'id, mesa_numero, total, status, criado_em, alerta_reuso_em, ' +
          'pedido_itens(id, nome_snap, quantidade, combo_pai_id, pedido_item_opcoes(nome_snap))',
      )
      .eq('estabelecimento_id', loja.id)
      .is('plaquinha_devolvida_em', null)
      .neq('status', 'cancelado')
      .order('criado_em') // fila por ordem de chegada

    if (error) {
      console.error('Falha ao carregar pedidos:', error)
      return
    }

    // REGRA 4: "hoje" no fuso do estabelecimento. Plaquinha esquecida
    // ontem nao polui a tela nem trava numero hoje.
    const diaLocal = (quando) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: loja.fuso,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(quando)

    const hoje = diaLocal(new Date())
    setPedidos((data ?? []).filter((p) => diaLocal(new Date(p.criado_em)) === hoje))
  }, [loja])

  // Tempo real: recarrega a lista inteira a cada aviso do banco.
  // Mais simples que aplicar a mudanca item a item, e nao dessincroniza.
  useEffect(() => {
    if (acesso !== 'liberado' || !loja) return

    carregarPedidos()

    let atraso = null
    const recarregarLogo = () => {
      clearTimeout(atraso)
      // pequena espera: o pedido chega antes dos itens dele
      atraso = setTimeout(carregarPedidos, 400)
    }

    const canal = supabase
      .channel(`painel-${loja.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, recarregarLogo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, recarregarLogo)
      .subscribe()

    return () => {
      clearTimeout(atraso)
      supabase.removeChannel(canal)
    }
  }, [acesso, loja, carregarPedidos])

  const atualizar = useCallback(
    async (pedido, mudanca, someDaTela) => {
      // some da tela na hora; o tempo real confirma logo depois
      setPedidos((atual) =>
        someDaTela
          ? atual.filter((p) => p.id !== pedido.id)
          : atual.map((p) => (p.id === pedido.id ? { ...p, ...mudanca } : p)),
      )

      const { error } = await supabase.from('pedidos').update(mudanca).eq('id', pedido.id)

      if (error) {
        console.error('Falha ao atualizar o pedido:', error)
        carregarPedidos() // desfaz o otimismo
      }
    },
    [carregarPedidos],
  )

  return { ...base, totalPlaquinhas, pedidos, agora, atualizar }
}
