// ============================================================
// TOTEM — controla em que etapa do pedido o cliente esta
//
// Busca o estabelecimento pelo endereco (/:slug). Nome, logo e
// cores vem do BANCO, nunca escritos aqui (REGRA 1): e o mesmo
// codigo servindo todos os clientes.
//
// Etapas: inicial -> cardapio -> produto -> carrinho -> mesa
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useInatividade } from '../lib/useInatividade.js'
import { useHeartbeat } from '../lib/useHeartbeat.js'
import { useCardapio, motivoEsgotado } from '../lib/useCardapio.js'
import Cardapio from '../componentes/Cardapio.jsx'
import Produto from '../componentes/Produto.jsx'
import Carrinho from '../componentes/Carrinho.jsx'
import NumeroMesa from '../componentes/NumeroMesa.jsx'

// Sem tocar em nada por este tempo, o totem pergunta se a pessoa
// ainda esta ali; sem resposta, limpa e volta ao inicio.
const SEGUNDOS_ATE_AVISAR = 60
const SEGUNDOS_DO_AVISO = 15

export default function Totem() {
  const { slug } = useParams()
  useHeartbeat(slug)
  const [estado, setEstado] = useState('carregando')
  const [loja, setLoja] = useState(null)
  const [etapa, setEtapa] = useState('inicial')
  const [produtoAberto, setProdutoAberto] = useState(null)
  const [carrinho, setCarrinho] = useState([])
  // enquanto o pedido esta sendo enviado (ou acabou de ser), o
  // relogio de inatividade fica parado: limpar a tela no meio de um
  // envio lento faria o cliente achar que falhou, com o pedido ja gravado
  const [enviando, setEnviando] = useState(false)
  const [avisoEsgotado, setAvisoEsgotado] = useState(null)

  const recomecar = useCallback(() => {
    setCarrinho([])
    setProdutoAberto(null)
    setEnviando(false)
    setAvisoEsgotado(null)
    setEtapa('inicial')
  }, [])

  // O servidor recusou porque algo esgotou enquanto o cliente pedia.
  // Devolve ele ao carrinho com TODAS as linhas afetadas marcadas —
  // pedir outro numero de mesa nao resolveria, o problema esta no
  // pedido. Um refrigerante esgotado invalida a linha dele e tambem
  // a do combo que o contem.
  function marcarItensEsgotados(itens, mensagem) {
    setCarrinho((atual) =>
      atual.map((item, i) => {
        const achado = itens.find((e) => e.indice === i)
        return achado ? { ...item, esgotado: true, motivo: `${achado.nome} esgotou` } : item
      }),
    )
    setAvisoEsgotado(mensagem)
    setEnviando(false)
    setEtapa('carrinho')
  }

  const cardapio = useCardapio(loja)

  // Marca as linhas do carrinho AO VIVO, sem esperar a recusa do
  // servidor: se o dono esgota um item agora, o cliente ve na hora.
  //
  // Nunca remover sozinho. O cliente veria o total mudar sem entender
  // por que, ou nem notaria a falta e descobriria no caixa — e
  // culparia a loja, não o sistema. Ele remove, explicitamente.
  const carrinhoMarcado = useMemo(
    () =>
      carrinho.map((item) => {
        const motivo = motivoEsgotado(item, cardapio.porId)
        return motivo ? { ...item, esgotado: true, motivo } : item
      }),
    [carrinho, cardapio.porId],
  )

  const temEsgotado = carrinhoMarcado.some((item) => item.esgotado)

  const inatividade = useInatividade({
    ativo: etapa !== 'inicial' && !enviando,
    segundosAteAvisar: SEGUNDOS_ATE_AVISAR,
    segundosDoAviso: SEGUNDOS_DO_AVISO,
    aoExpirar: recomecar,
  })

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

  // toda tela depois da inicial ganha o aviso de inatividade por cima
  const comAviso = (tela) => (
    <>
      {tela}
      {inatividade.avisando && (
        <AvisoInatividade
          restam={inatividade.restam}
          corTexto={corTexto}
          corFundo={corFundo}
          aoContinuar={inatividade.continuar}
          aoDesistir={recomecar}
        />
      )}
    </>
  )

  if (etapa === 'mesa') {
    return comAviso(
      <NumeroMesa
        slug={slug}
        carrinho={carrinho}
        corTexto={corTexto}
        corFundo={corFundo}
        aoVoltar={() => setEtapa('carrinho')}
        aoOcupado={setEnviando}
        aoItemEsgotado={marcarItensEsgotados}
        aoConcluir={recomecar}
      />,
    )
  }

  if (etapa === 'carrinho') {
    return comAviso(
      <Carrinho
        carrinho={carrinhoMarcado}
        corTexto={corTexto}
        corFundo={corFundo}
        // frase do servidor quando houve recusa; senao a que vale para
        // o item que acabou de esgotar na tela
        avisoEsgotado={
          avisoEsgotado ?? (temEsgotado ? 'Um item do seu pedido esgotou.' : null)
        }
        aoVoltar={() => {
          setAvisoEsgotado(null)
          setEtapa('cardapio')
        }}
        aoRemover={(indice) => {
          setCarrinho((atual) => atual.filter((_, i) => i !== indice))
          setAvisoEsgotado(null)
        }}
        // Refaz o total da linha a partir do preco de UM, guardado
        // quando o item foi montado. Sem ele nao daria: o total antigo
        // ja tem a quantidade velha embutida, e dividir para descobrir
        // o unitario erraria centavos por arredondamento.
        aoMudarQuantidade={(indice, nova) => {
          if (nova < 1 || nova > 99) return
          setCarrinho((atual) =>
            atual.map((item, i) =>
              i === indice
                ? { ...item, quantidade: nova, totalMostrado: item.unitarioMostrado * nova }
                : item,
            ),
          )
          setAvisoEsgotado(null)
        }}
        aoFinalizar={() => setEtapa('mesa')}
      />,
    )
  }

  if (etapa === 'produto') {
    return comAviso(
      <Produto
        produto={produtoAberto}
        corTexto={corTexto}
        corFundo={corFundo}
        aoVoltar={() => setEtapa('cardapio')}
        aoAdicionar={(item) => {
          setCarrinho((atual) => [...atual, item])
          setEtapa('cardapio')
        }}
      />,
    )
  }

  if (etapa === 'cardapio') {
    return comAviso(
      <Cardapio
        loja={loja}
        estado={cardapio.estado}
        categorias={cardapio.categorias}
        produtos={cardapio.produtos}
        corTexto={corTexto}
        corFundo={corFundo}
        carrinho={carrinho}
        aoVoltar={() => setEtapa('inicial')}
        aoVerPedido={() => setEtapa('carrinho')}
        aoEscolherProduto={(produto) => {
          setProdutoAberto(produto)
          setEtapa('produto')
        }}
      />,
    )
  }

  // Tela inicial: a tela INTEIRA e o botao. Em totem nao se pede
  // pontaria — o alvo de toque e tudo que o cliente ve.
  return (
    <button
      onClick={() => setEtapa('cardapio')}
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
// AVISO DE INATIVIDADE
//
// Cobre a tela inteira de proposito: precisa ser visto por quem
// esta na fila tambem, nao so por quem esta parado no totem.
//
// "Cancelar" existe para quem desistiu poder liberar o totem na
// hora, em vez de ir embora e deixar a tela ocupada.
// ------------------------------------------------------------
function AvisoInatividade({ restam, corTexto, corFundo, aoContinuar, aoDesistir }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 p-8 text-center"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <p className="text-5xl font-black">Ainda está aí?</p>
      <p className="text-3xl opacity-70">
        Seu pedido será apagado em <span className="font-black">{restam}</span>
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-6">
        <button
          onClick={aoContinuar}
          className="min-h-[88px] rounded-2xl px-16 text-3xl font-black active:scale-95"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          Continuar pedido
        </button>
        <button
          onClick={aoDesistir}
          className="min-h-[88px] rounded-2xl border-4 px-12 text-3xl font-bold active:scale-95"
          style={{ borderColor: corTexto }}
        >
          Cancelar
        </button>
      </div>
    </div>
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
