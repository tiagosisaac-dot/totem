// ============================================================
// PAGAMENTO PIX — gera o QR code e consulta se ja confirmou
//
// Mesmo padrao de pedidos.js: chama a Edge Function, nunca fala com
// o Mercado Pago direto (o token de cada loja so existe no servidor).
// ============================================================

import { supabase } from './supabase.js'

async function chamar(nomeFuncao, corpo, mensagemPadrao) {
  let resposta
  try {
    resposta = await supabase.functions.invoke(nomeFuncao, { body: corpo })
  } catch (e) {
    console.error(`Falha de rede ao chamar ${nomeFuncao}:`, e)
    return { ok: false, mensagem: 'Sem conexão. Chame um atendente.' }
  }

  const { data, error } = resposta
  if (error) {
    let mensagem = mensagemPadrao
    try {
      const detalhe = await error.context?.json()
      if (detalhe?.erro) mensagem = detalhe.erro
    } catch {
      // resposta sem corpo legivel: fica a mensagem padrao
    }
    console.error(`${nomeFuncao} recusou:`, error)
    return { ok: false, mensagem }
  }

  return { ok: true, dados: data }
}

export function criarCobrancaPix({ slug, pedidoId }) {
  return chamar(
    'criar-cobranca-pix',
    { slug, pedido_id: pedidoId },
    'Não foi possível gerar o Pix. Chame um atendente.',
  )
}

export function consultarPagamentoPix({ slug, pedidoId }) {
  return chamar(
    'consultar-pagamento-pix',
    { slug, pedido_id: pedidoId },
    'Não foi possível consultar o pagamento.',
  )
}
