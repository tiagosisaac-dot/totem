// ============================================================
// IMPRESSAO DO PEDIDO — /:slug/impressora
//
// Fica aberta numa aba no computador da loja, ligado por USB na
// Bematech i9. O navegador sozinho nao alcança impressora USB — o
// QZ Tray (instalado nesse computador) e a ponte.
//
// Pedido NAO imprime sozinho — precisa do clique manual em "Imprimir"
// (botao vermelho), depois que o caixa confirma o pagamento. Sem
// isso, pedido de quem desiste antes de pagar iria pra producao do
// mesmo jeito. Depois de impresso, vira "Reimprimir" (verde) — papel
// pode emperrar ou acabar, nunca falha silenciosa (mesmo principio
// do heartbeat).
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import qz from 'qz-tray'
import { supabase } from '../lib/supabase.js'
import { useLojaLogada } from '../lib/useLojaLogada.js'
import { montarCupom } from '../lib/cupom.js'
import { configurarAssinaturaQz } from '../lib/qzTray.js'
import { emReais } from '../lib/formato.js'
import { ALERTA, Cabecalho, bloqueioDoPainel } from '../componentes/PainelComuns.jsx'

const SELECT_PEDIDO =
  'id, senha, nome_cliente, tipo_consumo, total, criado_em, impresso_em, ' +
  'pedido_itens(id, nome_snap, quantidade, combo_pai_id, pedido_item_opcoes(nome_snap))'

export default function Impressora() {
  const { slug } = useParams()
  const painel = useLojaLogada(slug)
  const { loja, acesso, corTexto, corFundo } = painel

  const [config, setConfig] = useState(null)
  const [qzConectado, setQzConectado] = useState(false)
  const [qzErro, setQzErro] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [erroImpressao, setErroImpressao] = useState(null)

  // ---- config desta loja: nome da impressora + certificado do QZ Tray ----
  // (estabelecimentos.config e jsonb — REGRA 1, nada fixo no codigo)
  useEffect(() => {
    if (!loja) return
    let cancelado = false

    supabase
      .from('estabelecimentos')
      .select('config')
      .eq('id', loja.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        const cfg = data?.config ?? {}
        setConfig({
          impressoraNome: cfg.impressora_nome ?? null,
          qzCertificado: cfg.qz_certificado ?? null,
          qzChavePrivada: cfg.qz_chave_privada ?? null,
        })
      })

    return () => {
      cancelado = true
    }
  }, [loja])

  // ---- conexao com o QZ Tray instalado neste computador ----
  useEffect(() => {
    if (acesso !== 'liberado' || !config) return

    if (!config.qzCertificado || !config.qzChavePrivada) {
      setQzErro('Certificado do QZ Tray não configurado para esta loja.')
      return
    }

    let cancelado = false
    configurarAssinaturaQz(qz, config.qzCertificado, config.qzChavePrivada)

    qz.websocket
      .connect()
      .then(() => {
        if (!cancelado) setQzConectado(true)
      })
      .catch((e) => {
        if (cancelado) return
        console.error('Falha ao conectar no QZ Tray:', e)
        setQzErro('QZ Tray não encontrado neste computador.')
      })

    return () => {
      cancelado = true
      if (qz.websocket.isActive()) qz.websocket.disconnect()
    }
  }, [acesso, config])

  // ---- pedidos de hoje, tempo real (mesmo padrao da antiga tela de cozinha) ----
  const carregarPedidos = useCallback(async () => {
    if (!loja) return

    const { data, error } = await supabase
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .eq('estabelecimento_id', loja.id)
      .eq('origem', 'totem')
      .order('criado_em')

    if (error) {
      console.error('Falha ao carregar pedidos:', error)
      return
    }

    // REGRA 4: "hoje" no fuso do estabelecimento, nao em UTC.
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
      .channel(`impressora-${loja.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, recarregarLogo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, recarregarLogo)
      .subscribe()

    return () => {
      clearTimeout(atraso)
      supabase.removeChannel(canal)
    }
  }, [acesso, loja, carregarPedidos])

  // ---- imprime um pedido, sempre por clique manual (botao
  // "Imprimir"/"Reimprimir") — nunca automatico, ver nota no topo ----
  const imprimir = useCallback(
    async (pedido) => {
      if (!qzConectado) {
        setErroImpressao('QZ Tray não está conectado. Não é possível imprimir.')
        return
      }
      if (!config?.impressoraNome) {
        setErroImpressao('Nenhuma impressora configurada para esta loja.')
        return
      }

      setErroImpressao(null)
      try {
        const configImpressao = qz.configs.create(config.impressoraNome)
        await qz.print(configImpressao, [montarCupom(pedido)])

        const agora = new Date().toISOString()
        const { error } = await supabase
          .from('pedidos')
          .update({ impresso_em: agora })
          .eq('id', pedido.id)
        if (error) throw error

        setPedidos((atual) =>
          atual.map((p) => (p.id === pedido.id ? { ...p, impresso_em: agora } : p)),
        )
      } catch (e) {
        console.error('Falha ao imprimir:', e)
        setErroImpressao(
          `Não foi possível imprimir o pedido de ${pedido.nome_cliente}. Use "Reimprimir".`,
        )
      }
    },
    [qzConectado, config],
  )

  const bloqueio = bloqueioDoPainel(painel, 'Impressora')
  if (bloqueio) return bloqueio

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <Cabecalho titulo="Impressora" loja={loja} corTexto={corTexto}>
        <span
          className="ml-auto rounded-xl px-4 py-2 text-xl font-black text-white"
          style={{ backgroundColor: qzConectado ? '#16A34A' : ALERTA }}
        >
          {qzConectado ? 'QZ Tray conectado' : (qzErro ?? 'Conectando ao QZ Tray...')}
        </span>
      </Cabecalho>

      {config && !config.impressoraNome && (
        <p className="px-6 py-4 text-xl font-bold text-white" style={{ backgroundColor: ALERTA }}>
          Nenhuma impressora configurada para esta loja (falta impressora_nome em
          estabelecimentos.config).
        </p>
      )}

      {erroImpressao && (
        <p
          className="px-6 py-4 text-xl font-bold text-white"
          style={{ backgroundColor: ALERTA }}
          role="alert"
        >
          {erroImpressao}
        </p>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: 'contain' }}>
        {pedidos.length === 0 ? (
          <p className="mt-12 text-center text-3xl opacity-60">Nenhum pedido hoje ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pedidos.map((pedido) => (
              <li
                key={pedido.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border-4 p-4"
                style={{ borderColor: `${corTexto}22` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold">
                    {pedido.nome_cliente}{' '}
                    <span className="text-lg font-normal opacity-60">
                      ({pedido.tipo_consumo === 'levar' ? 'para levar' : 'comer aqui'}) · #
                      {pedido.senha}
                    </span>
                  </p>
                  <p className="text-xl opacity-70">{emReais(pedido.total)}</p>
                </div>

                <span className="text-lg font-bold opacity-60">
                  {pedido.impresso_em ? 'Já foi pra cozinha' : 'Aguardando pagamento no caixa'}
                </span>

                <button
                  onClick={() => imprimir(pedido)}
                  className="min-h-[60px] rounded-xl px-5 text-xl font-bold text-white active:scale-95"
                  style={{ backgroundColor: pedido.impresso_em ? '#16A34A' : ALERTA }}
                >
                  {pedido.impresso_em ? 'Reimprimir' : 'Imprimir'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
