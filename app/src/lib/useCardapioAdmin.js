// ============================================================
// CARDAPIO — CRUD PARA O PAINEL (/superadmin)
//
// Parecido com useCardapio.js, mas pensado pra edicao: recebe o id da
// loja escolhida (nao vem de sessao/slug), carrega TUDO (inclusive
// categoria pausada e produto esgotado — quem edita precisa ver, quem
// pede no totem nao) e nao tem realtime (tela de edicao, nao de pedido
// chegando).
//
// Mesmo padrao de escrita do Admin.jsx: atualiza o estado local
// primeiro (otimista), manda pro banco, desfaz se der erro.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { enviarFotoProduto } from './fotoProduto.js'

export function useCardapioAdmin(lojaId) {
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(async () => {
    if (!lojaId) return
    setCarregando(true)
    setErro(null)

    const [respCategorias, respProdutos] = await Promise.all([
      supabase.from('categorias').select('id, nome, ordem, ativa').eq('estabelecimento_id', lojaId).order('ordem'),
      supabase
        .from('produtos')
        .select('id, categoria_id, nome, descricao, preco, imagem_url, tipo, disponivel, vendavel_sozinho, ordem')
        .eq('estabelecimento_id', lojaId)
        .order('ordem'),
    ])

    if (respCategorias.error || respProdutos.error) {
      console.error('Falha ao carregar cardápio para edição:', respCategorias.error || respProdutos.error)
      setErro('Não foi possível carregar o cardápio dessa loja.')
      setCarregando(false)
      return
    }

    setCategorias(respCategorias.data)
    setProdutos(respProdutos.data)
    setCarregando(false)
  }, [lojaId])

  useEffect(() => {
    carregar()
  }, [carregar])

  function proximaOrdem(lista) {
    return lista.reduce((maior, item) => Math.max(maior, item.ordem ?? 0), 0) + 1
  }

  async function criarCategoria({ nome }) {
    setErro(null)
    const nova = { estabelecimento_id: lojaId, nome, ordem: proximaOrdem(categorias), ativa: true }
    const { data, error } = await supabase.from('categorias').insert(nova).select().single()
    if (error) {
      console.error('Falha ao criar categoria:', error)
      setErro('Não foi possível criar a categoria.')
      return false
    }
    setCategorias((atual) => [...atual, data])
    return true
  }

  async function atualizarCategoria(id, mudanca) {
    const anterior = categorias
    setErro(null)
    setCategorias((atual) => atual.map((c) => (c.id === id ? { ...c, ...mudanca } : c)))

    const { error } = await supabase.from('categorias').update(mudanca).eq('id', id)
    if (error) {
      console.error('Falha ao atualizar categoria:', error)
      setCategorias(anterior)
      setErro('Não foi possível salvar a categoria.')
      return false
    }
    return true
  }

  async function removerCategoria(categoria) {
    if (!window.confirm(`Apagar a categoria "${categoria.nome}"? Os produtos dela ficam sem categoria, não são apagados.`)) {
      return false
    }
    const anterior = categorias
    setErro(null)
    setCategorias((atual) => atual.filter((c) => c.id !== categoria.id))

    const { error } = await supabase.from('categorias').delete().eq('id', categoria.id)
    if (error) {
      console.error('Falha ao apagar categoria:', error)
      setCategorias(anterior)
      setErro('Não foi possível apagar a categoria.')
      return false
    }
    setProdutos((atual) => atual.map((p) => (p.categoria_id === categoria.id ? { ...p, categoria_id: null } : p)))
    return true
  }

  async function criarProduto({ categoria_id, nome, descricao, preco, vendavel_sozinho, arquivo }) {
    setErro(null)
    const id = crypto.randomUUID()

    let imagem_url = null
    if (arquivo) {
      try {
        imagem_url = await enviarFotoProduto({ estabelecimentoId: lojaId, produtoId: id, arquivo })
      } catch (e) {
        console.error('Falha ao subir a foto:', e)
        setErro('Não foi possível subir a foto. O produto não foi criado — tente de novo.')
        return false
      }
    }

    const novo = {
      id,
      estabelecimento_id: lojaId,
      categoria_id: categoria_id || null,
      nome,
      descricao: descricao || null,
      preco,
      imagem_url,
      tipo: 'simples',
      disponivel: true,
      vendavel_sozinho,
      ordem: proximaOrdem(produtos.filter((p) => p.categoria_id === categoria_id)),
    }

    const { data, error } = await supabase.from('produtos').insert(novo).select().single()
    if (error) {
      console.error('Falha ao criar produto:', error)
      setErro('Não foi possível criar o produto.')
      return false
    }
    setProdutos((atual) => [...atual, data])
    return true
  }

  async function atualizarProduto(produto, mudanca, arquivo) {
    setErro(null)
    const camposFinais = { ...mudanca }

    if (arquivo) {
      try {
        camposFinais.imagem_url = await enviarFotoProduto({
          estabelecimentoId: lojaId,
          produtoId: produto.id,
          arquivo,
        })
      } catch (e) {
        console.error('Falha ao subir a foto:', e)
        setErro('Não foi possível subir a foto. Nada foi salvo — tente de novo.')
        return false
      }
    }

    const anterior = produtos
    setProdutos((atual) => atual.map((p) => (p.id === produto.id ? { ...p, ...camposFinais } : p)))

    const { error } = await supabase.from('produtos').update(camposFinais).eq('id', produto.id)
    if (error) {
      console.error('Falha ao salvar produto:', error)
      setProdutos(anterior)
      setErro(`Não foi possível salvar "${produto.nome}".`)
      return false
    }
    return true
  }

  async function removerProduto(produto) {
    if (!window.confirm(`Apagar "${produto.nome}"? Pedidos antigos não são afetados.`)) return false

    const anterior = produtos
    setErro(null)
    setProdutos((atual) => atual.filter((p) => p.id !== produto.id))

    const { error } = await supabase.from('produtos').delete().eq('id', produto.id)
    if (error) {
      console.error('Falha ao apagar produto:', error)
      setProdutos(anterior)
      setErro(`Não foi possível apagar "${produto.nome}".`)
      return false
    }
    return true
  }

  return {
    categorias,
    produtos,
    carregando,
    erro,
    criarCategoria,
    atualizarCategoria,
    removerCategoria,
    criarProduto,
    atualizarProduto,
    removerProduto,
  }
}
