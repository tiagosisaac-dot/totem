// ============================================================
// ESTATISTICAS DE PEDIDOS — usado no /admin (uma loja) e no
// /superadmin (todas as lojas agrupadas)
//
// So mede o que ja da pra medir com o banco de hoje: pedido criado
// e nao pago depois de MINUTOS_ATE_CONTAR_DESISTENCIA conta como
// desistencia (o QR do Pix expira em 15 min — ver criarPagamentoPix).
// Quedas vem de totem_eventos (migracao 012).
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const MINUTOS_ATE_CONTAR_DESISTENCIA = 20

// estabelecimentoId omitido = todas as lojas, agrupadas por loja
// (uso do /superadmin). Passado = so aquela loja (uso do /admin).
export function useEstatisticasPedidos({ inicio, fim, estabelecimentoId }) {
  const [porLoja, setPorLoja] = useState({})
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!inicio || !fim) return
    let cancelado = false
    setCarregando(true)
    setErro(null)

    const limiteDesistencia = new Date(Date.now() - MINUTOS_ATE_CONTAR_DESISTENCIA * 60_000).toISOString()

    let consultaPedidos = supabase
      .from('pedidos')
      .select('estabelecimento_id, pago, criado_em')
      .eq('origem', 'totem')
      .gte('criado_em', inicio)
      .lte('criado_em', fim)

    let consultaEventos = supabase
      .from('totem_eventos')
      .select('estabelecimento_id')
      .eq('tipo', 'queda')
      .gte('criado_em', inicio)
      .lte('criado_em', fim)

    if (estabelecimentoId) {
      consultaPedidos = consultaPedidos.eq('estabelecimento_id', estabelecimentoId)
      consultaEventos = consultaEventos.eq('estabelecimento_id', estabelecimentoId)
    }

    Promise.all([consultaPedidos, consultaEventos]).then(([respPedidos, respEventos]) => {
      if (cancelado) return
      setCarregando(false)

      if (respPedidos.error || respEventos.error) {
        console.error('Falha ao carregar estatísticas:', respPedidos.error || respEventos.error)
        setErro('Não foi possível carregar as estatísticas.')
        return
      }

      const dados = {}
      const linhaDaLoja = (id) => (dados[id] ??= { total: 0, pagos: 0, desistencias: 0, quedas: 0 })

      for (const p of respPedidos.data) {
        const linha = linhaDaLoja(p.estabelecimento_id)
        linha.total += 1
        if (p.pago) {
          linha.pagos += 1
        } else if (p.criado_em < limiteDesistencia) {
          linha.desistencias += 1
        }
      }
      for (const e of respEventos.data) {
        linhaDaLoja(e.estabelecimento_id).quedas += 1
      }

      setPorLoja(dados)
    })

    return () => {
      cancelado = true
    }
  }, [inicio, fim, estabelecimentoId])

  return { porLoja, carregando, erro }
}
