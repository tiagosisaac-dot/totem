// ============================================================
// ENVIO DO PEDIDO
//
// Manda apenas ESCOLHAS (ids) para a Edge Function. Nenhum preco,
// nenhum total: o servidor busca os precos no banco e recalcula
// tudo (REGRA 2). Se mandarmos um total, ele e ignorado.
// ============================================================

import { supabase } from './supabase.js'

export async function enviarPedido({ slug, mesaNumero, carrinho }) {
  const corpo = {
    slug,
    mesa_numero: mesaNumero,
    itens: carrinho.map((item) => ({
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      opcoes: item.opcoes,
      combo_escolhas: item.comboEscolhas,
    })),
  }

  let resposta
  try {
    resposta = await supabase.functions.invoke('criar-pedido', { body: corpo })
  } catch (e) {
    // nem chegou a sair do tablet: wi-fi da loja caiu
    console.error('Falha de rede ao enviar o pedido:', e)
    return { ok: false, mensagem: 'Sem conexão. Chame um atendente.' }
  }

  const { data, error } = resposta

  if (error) {
    // A funcao recusa com { erro: "..." } e status 4xx. O
    // supabase-js trata 4xx como erro e guarda a resposta crua
    // em error.context — e de la que vem a mensagem que o cliente
    // precisa ler ("pegue outra plaquinha", "item esgotado").
    let mensagem = 'Não foi possível enviar o pedido. Tente novamente.'
    let codigo = null
    let itens = []
    try {
      const detalhe = await error.context?.json()
      if (detalhe?.erro) mensagem = detalhe.erro
      // codigo e lista de itens vem do servidor para o totem AGIR,
      // nao so exibir. Nunca deduzir o motivo lendo a mensagem.
      codigo = detalhe?.codigo ?? null
      if (Array.isArray(detalhe?.itens)) itens = detalhe.itens
    } catch {
      // resposta sem corpo legivel: fica a mensagem generica
    }
    console.error('Pedido recusado:', error)
    return { ok: false, mensagem, codigo, itens }
  }

  return { ok: true, pedido: data }
}
