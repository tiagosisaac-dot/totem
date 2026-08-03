// ============================================================
// PAINEL — o que a cozinha e o balcao compartilham
//
// As duas telas usam os mesmos dados (loja, acesso, pedidos com a
// plaquinha fora) e o mesmo tempo real. O que muda entre elas e
// apenas O QUE cada uma mostra e qual botao oferece.
//
// Sem isso, a mesma logica ficaria copiada em dois arquivos — e
// um dia alguem corrigiria so um dos dois.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSessao } from './sessao.js'

export function usePainel(slug) {
  const { sessao, carregando: carregandoSessao } = useSessao()

  const [loja, setLoja] = useState(null)
  const [totalPlaquinhas, setTotalPlaquinhas] = useState(null)
  const [acesso, setAcesso] = useState('verificando')
  const [pedidos, setPedidos] = useState([])
  const [agora, setAgora] = useState(Date.now())

  // relogio para o "ha X min" nao congelar na tela
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 20000)
    return () => clearInterval(relogio)
  }, [])

  useEffect(() => {
    let cancelado = false

    async function carregarLoja() {
      const { data } = await supabase
        .from('estabelecimentos')
        .select('id, nome, fuso, cor_primaria, cor_secundaria')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelado || !data) return
      setLoja(data)

      const { count } = await supabase
        .from('mesas')
        .select('numero', { count: 'exact', head: true })
        .eq('estabelecimento_id', data.id)
        .eq('ativa', true)

      if (!cancelado) setTotalPlaquinhas(count)
    }

    carregarLoja()
    return () => {
      cancelado = true
    }
  }, [slug])

  // A pessoa logada pertence A ESTA loja?
  // Sem conferir, o painel de outra loja abriria vazio por causa das
  // policies e pareceria bug de codigo (REGRA 6).
  useEffect(() => {
    if (!sessao || !loja) return
    let cancelado = false

    supabase
      .from('perfis')
      .select('estabelecimento_id')
      .eq('user_id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) setAcesso(data?.estabelecimento_id === loja.id ? 'liberado' : 'negado')
      })

    return () => {
      cancelado = true
    }
  }, [sessao, loja])

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

  return {
    sessao,
    carregandoSessao,
    loja,
    totalPlaquinhas,
    acesso,
    pedidos,
    agora,
    atualizar,
    corTexto: loja?.cor_primaria || '#111111',
    corFundo: loja?.cor_secundaria || '#F5F5F5',
  }
}
