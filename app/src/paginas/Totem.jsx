// ============================================================
// TOTEM — tela inicial
//
// Busca o estabelecimento pelo endereco (/:slug). Nome, logo e
// cores vem do BANCO, nunca escritos aqui (REGRA 1): e o mesmo
// codigo servindo todos os clientes.
//
// As proximas etapas (cardapio, produto, carrinho, numero da
// mesa) entram neste arquivo depois.
// ============================================================

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Totem() {
  const { slug } = useParams()
  const [estado, setEstado] = useState('carregando')
  const [loja, setLoja] = useState(null)
  const [iniciado, setIniciado] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function buscarLoja() {
      setEstado('carregando')

      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('id, nome, logo_url, cor_primaria, cor_secundaria, aceita_pedidos')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelado) return

      if (error) {
        // Wi-fi caiu ou banco fora do ar. Nunca fingir que esta
        // tudo bem — o cliente precisa saber para chamar alguem.
        console.error('Falha ao buscar o estabelecimento:', error)
        setEstado('sem_conexao')
        return
      }

      if (!data) {
        // Cai aqui tambem quando a loja esta bloqueada por
        // inadimplencia: a policy de RLS so devolve quem esta
        // ativo e nao bloqueado. E de proposito — o cliente final
        // nao tem que ficar sabendo de pendencia financeira.
        setEstado('indisponivel')
        return
      }

      setLoja(data)
      setEstado('pronto')
    }

    buscarLoja()
    return () => {
      cancelado = true
    }
  }, [slug])

  // nome da aba tambem vem do banco
  useEffect(() => {
    if (loja?.nome) document.title = loja.nome
  }, [loja])

  if (estado === 'carregando') {
    return <Aviso texto="Carregando..." />
  }

  if (estado === 'sem_conexao') {
    return (
      <Aviso
        texto="Sem conexão"
        detalhe="Chame um atendente para fazer seu pedido no caixa."
      />
    )
  }

  if (estado === 'indisponivel') {
    return <Aviso texto="Sistema temporariamente indisponível." />
  }

  // cores do banco; o padrao aqui e so rede de seguranca
  const corTexto = loja.cor_primaria || '#111111'
  const corFundo = loja.cor_secundaria || '#F5F5F5'

  if (!loja.aceita_pedidos) {
    return (
      <Aviso
        texto="Não estamos aceitando pedidos agora"
        detalhe="Faça seu pedido no caixa."
        corTexto={corTexto}
        corFundo={corFundo}
      />
    )
  }

  if (iniciado) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center"
        style={{ backgroundColor: corFundo, color: corTexto }}
      >
        <p className="text-4xl font-bold">Cardápio entra aqui</p>
        <p className="text-2xl opacity-70">Próxima etapa da construção.</p>
        <button
          onClick={() => setIniciado(false)}
          className="min-h-[60px] rounded-2xl border-4 px-10 py-4 text-2xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          Voltar
        </button>
      </div>
    )
  }

  // Tela inicial: a tela INTEIRA e o botao. Em totem nao se pede
  // pontaria — o alvo de toque e tudo que o cliente ve.
  return (
    <button
      onClick={() => setIniciado(true)}
      className="flex h-full w-full flex-col items-center justify-center gap-12 p-8 text-center active:opacity-80"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      {loja.logo_url ? (
        <img
          src={loja.logo_url}
          alt={loja.nome}
          className="max-h-[40vh] max-w-[80vw] object-contain"
        />
      ) : (
        <h1 className="text-6xl font-black tracking-tight">{loja.nome}</h1>
      )}

      <p className="animate-pulse text-4xl font-bold">Toque para pedir</p>
    </button>
  )
}

// ------------------------------------------------------------
// Tela de recado, usada nos estados em que nao da para pedir
// ------------------------------------------------------------
function Aviso({ texto, detalhe, corTexto = '#111111', corFundo = '#F5F5F5' }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <p className="text-5xl font-bold">{texto}</p>
      {detalhe && <p className="text-3xl opacity-70">{detalhe}</p>}
    </div>
  )
}
