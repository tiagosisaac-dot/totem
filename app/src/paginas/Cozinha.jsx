// ============================================================
// KDS — a tela da cozinha
//
// Atualiza sozinha: o banco avisa quando entra pedido novo, sem
// ninguem precisar recarregar nada.
//
// Prioridades de leitura, nessa ordem:
//   1. NUMERO DA MESA — lido de longe, maior que tudo
//   2. o que produzir
//   3. ha quanto tempo o pedido esta esperando
//
// "Entregue" nao e enfeite: e o que libera o numero da plaquinha
// para o proximo cliente.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useSessao, sair } from '../lib/sessao.js'
import Login from '../componentes/Login.jsx'

const ABERTOS = ['aguardando_pagamento', 'em_producao', 'pronto']

export default function Cozinha() {
  const { slug } = useParams()
  const { sessao, carregando: carregandoSessao } = useSessao()

  const [loja, setLoja] = useState(null)
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
    supabase
      .from('estabelecimentos')
      .select('id, nome, cor_primaria, cor_secundaria')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) setLoja(data)
      })
    return () => {
      cancelado = true
    }
  }, [slug])

  // A pessoa logada pertence A ESTA loja?
  // Sem isso, o KDS de outra loja abriria vazio e pareceria bug.
  useEffect(() => {
    if (!sessao || !loja) return
    let cancelado = false

    supabase
      .from('perfis')
      .select('estabelecimento_id')
      .eq('user_id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        setAcesso(data?.estabelecimento_id === loja.id ? 'liberado' : 'negado')
      })

    return () => {
      cancelado = true
    }
  }, [sessao, loja])

  const carregarPedidos = useCallback(async () => {
    if (!loja) return

    const { data, error } = await supabase
      .from('pedidos')
      .select(
        'id, mesa_numero, total, status, criado_em, alerta_reuso_em, ' +
          'pedido_itens(id, nome_snap, quantidade, combo_pai_id, pedido_item_opcoes(nome_snap))',
      )
      .eq('estabelecimento_id', loja.id)
      .in('status', ABERTOS)
      .order('criado_em') // mais antigo primeiro: fila e por chegada

    if (error) {
      console.error('Falha ao carregar pedidos:', error)
      return
    }
    setPedidos(data ?? [])
  }, [loja])

  // Tempo real: o banco avisa, a tela recarrega a lista.
  // Recarregar a lista inteira em vez de aplicar a mudanca item a
  // item e mais simples e evita a tela ficar dessincronizada.
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
      .channel(`kds-${loja.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, recarregarLogo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, recarregarLogo)
      .subscribe()

    return () => {
      clearTimeout(atraso)
      supabase.removeChannel(canal)
    }
  }, [acesso, loja, carregarPedidos])

  async function mudarStatus(pedido, novoStatus) {
    const carimbo =
      novoStatus === 'pronto' ? { pronto_em: new Date().toISOString() } : { entregue_em: new Date().toISOString() }

    // some da tela na hora; o tempo real confirma logo depois
    setPedidos((atual) =>
      novoStatus === 'entregue'
        ? atual.filter((p) => p.id !== pedido.id)
        : atual.map((p) => (p.id === pedido.id ? { ...p, status: novoStatus } : p)),
    )

    const { error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus, ...carimbo })
      .eq('id', pedido.id)

    if (error) {
      console.error('Falha ao mudar o status:', error)
      carregarPedidos() // desfaz o otimismo
    }
  }

  const corTexto = loja?.cor_primaria || '#111111'
  const corFundo = loja?.cor_secundaria || '#F5F5F5'

  if (carregandoSessao || !loja) {
    return <Tela texto="Carregando..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (!sessao) {
    return <Login titulo={`Cozinha — ${loja.nome}`} corTexto={corTexto} corFundo={corFundo} />
  }

  if (acesso === 'verificando') {
    return <Tela texto="Verificando acesso..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (acesso === 'negado') {
    return (
      <Tela
        texto="Sem acesso a esta loja"
        detalhe="Este usuário pertence a outro estabelecimento."
        corTexto={corTexto}
        corFundo={corFundo}
        aoSair={sair}
      />
    )
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <header
        className="flex items-center gap-4 border-b-2 px-6 py-3"
        style={{ borderColor: `${corTexto}22` }}
      >
        <h1 className="text-3xl font-black">Cozinha</h1>
        <span className="text-2xl opacity-60">{loja.nome}</span>
        <span className="ml-auto text-2xl font-bold">
          {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
        </span>
        <button
          onClick={sair}
          className="min-h-[52px] rounded-xl border-4 px-5 text-xl font-bold active:scale-95"
          style={{ borderColor: `${corTexto}44` }}
        >
          Sair
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: 'contain' }}>
        {pedidos.length === 0 ? (
          <p className="mt-16 text-center text-4xl opacity-50">Nenhum pedido no momento.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-5 xl:grid-cols-3">
            {pedidos.map((pedido) => (
              <li key={pedido.id}>
                <CartaoPedido
                  pedido={pedido}
                  agora={agora}
                  corTexto={corTexto}
                  corFundo={corFundo}
                  aoMudarStatus={mudarStatus}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

// ------------------------------------------------------------
function CartaoPedido({ pedido, agora, corTexto, corFundo, aoMudarStatus }) {
  const minutos = Math.max(0, Math.floor((agora - new Date(pedido.criado_em).getTime()) / 60000))
  const pronto = pedido.status === 'pronto'

  // itens de combo aparecem embaixo do combo, nao soltos na lista
  const principais = pedido.pedido_itens.filter((i) => !i.combo_pai_id)
  const filhosDe = (id) => pedido.pedido_itens.filter((i) => i.combo_pai_id === id)

  return (
    <article
      className="flex h-full flex-col gap-3 rounded-3xl border-4 p-4"
      style={{ borderColor: pronto ? corTexto : `${corTexto}33` }}
    >
      <div className="flex items-start gap-4">
        <div
          className="rounded-2xl px-5 py-2 text-center leading-none"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          <p className="text-lg font-bold opacity-80">MESA</p>
          <p className="text-7xl font-black">{pedido.mesa_numero}</p>
        </div>

        <div className="ml-auto text-right">
          <p className="text-2xl font-bold">{minutos} min</p>
          {pronto && <p className="text-xl font-black">PRONTO</p>}
        </div>
      </div>

      {/* alguem tentou usar este numero enquanto o pedido esta aberto:
          provavelmente ja foi entregue e ninguem marcou */}
      {pedido.alerta_reuso_em && (
        <p
          className="rounded-xl px-4 py-3 text-lg font-bold"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          Outro cliente tentou usar esta mesa. Já entregou? Marque como entregue.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {principais.map((item) => (
          <li key={item.id}>
            <p className="text-2xl font-bold leading-tight">
              {item.quantidade}× {item.nome_snap}
            </p>
            {item.pedido_item_opcoes.length > 0 && (
              <p className="text-xl opacity-70">
                {item.pedido_item_opcoes.map((o) => o.nome_snap).join(' • ')}
              </p>
            )}
            {filhosDe(item.id).map((filho) => (
              <p key={filho.id} className="pl-5 text-xl opacity-80">
                → {filho.nome_snap}
              </p>
            ))}
          </li>
        ))}
      </ul>

      <button
        onClick={() => aoMudarStatus(pedido, pronto ? 'entregue' : 'pronto')}
        className="mt-auto min-h-[68px] rounded-2xl text-2xl font-black active:scale-95"
        style={
          pronto
            ? { backgroundColor: corTexto, color: corFundo }
            : { border: `4px solid ${corTexto}`, color: corTexto }
        }
      >
        {pronto ? 'Entregue' : 'Pronto'}
      </button>
    </article>
  )
}

function Tela({ texto, detalhe, corTexto, corFundo, aoSair }) {
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
