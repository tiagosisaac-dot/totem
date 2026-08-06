// ============================================================
// CARDAPIO AO VIVO
//
// Vive acima das telas porque DUAS precisam dele: a lista de
// produtos e o carrinho. Antes ficava dentro da tela do cardapio, e
// o carrinho nao tinha como saber que um item esgotou.
//
// Carrega TODOS os produtos, inclusive os que so existem dentro de
// combo (vendavel_sozinho = false): a tela do cardapio filtra o que
// mostra, mas o carrinho precisa checar a bebida escolhida dentro do
// combo tambem.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'

export function useCardapio(loja) {
  const [estado, setEstado] = useState('carregando')
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])

  const idLoja = loja?.id ?? null

  const carregar = useCallback(
    async ({ primeiraVez } = {}) => {
      if (!idLoja) return

      // Recarregar por aviso do banco nao deve piscar "Carregando":
      // o cliente pode estar olhando a lista nesse instante.
      if (primeiraVez) setEstado('carregando')

      const [respCategorias, respProdutos] = await Promise.all([
        supabase
          .from('categorias')
          .select('id, nome, ordem')
          .eq('estabelecimento_id', idLoja)
          .eq('ativa', true)
          .order('ordem'),
        supabase
          .from('produtos')
          // 'tipo' diz se o produto abre com grupos de opcoes ou com
          // os slots do combo. 'vendavel_sozinho' decide se aparece
          // avulso na lista — mas o produto vem de qualquer forma,
          // porque o carrinho precisa checar itens de dentro do combo.
          .select(
            'id, categoria_id, nome, descricao, preco, imagem_url, tipo, ' +
              'disponivel, vendavel_sozinho, ordem',
          )
          .eq('estabelecimento_id', idLoja)
          .order('ordem'),
      ])

      if (respCategorias.error || respProdutos.error) {
        console.error('Falha ao carregar o cardápio:', respCategorias.error || respProdutos.error)
        if (primeiraVez) setEstado('erro')
        return
      }

      setCategorias(respCategorias.data)
      setProdutos(respProdutos.data)
      setEstado('pronto')
    },
    [idLoja],
  )

  useEffect(() => {
    carregar({ primeiraVez: true })
  }, [carregar])

  // Tempo real: o dono toca em "Esgotado" no painel e o totem sabe na
  // hora — tanto para apagar o item da lista quanto para marcar a
  // linha do carrinho de quem ja escolheu.
  //
  // REDUZ a recusa no envio, nao elimina: se esgotar no mesmo segundo,
  // o servidor ainda recusa. Quem decide e o banco.
  useEffect(() => {
    if (!idLoja) return
    let atraso = null

    const canal = supabase
      .channel(`cardapio-${idLoja}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos',
          // sem este filtro o totem reagiria a mudanca de outra loja:
          // a leitura de cardapio e publica por decisao nossa
          filter: `estabelecimento_id=eq.${idLoja}`,
        },
        () => {
          clearTimeout(atraso)
          atraso = setTimeout(carregar, 300)
        },
      )
      .subscribe()

    return () => {
      clearTimeout(atraso)
      supabase.removeChannel(canal)
    }
  }, [idLoja, carregar])

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])

  return { estado, categorias, produtos, porId }
}

// ------------------------------------------------------------
// Uma linha do carrinho ainda pode ser vendida?
//
// Confere o produto e, se for combo, tambem o que foi escolhido
// dentro dele: um refrigerante esgotado invalida a linha do
// refrigerante avulso E a do combo que o contem.
//
// Devolve o motivo (para mostrar ao cliente) ou null.
// ------------------------------------------------------------
export function motivoEsgotado(item, porId) {
  const principal = porId.get(item.produto.id)
  // produto ainda nao carregado: nao marcar. Alarme falso e pior que
  // atraso — o servidor recusa de qualquer forma se for o caso.
  if (principal && !principal.disponivel) return `${principal.nome} esgotou`

  for (const escolha of item.comboEscolhas ?? []) {
    const filho = porId.get(escolha.produto_id)
    if (filho && !filho.disponivel) return `${filho.nome} esgotou`
  }

  return null
}
