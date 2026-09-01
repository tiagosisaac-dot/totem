// ============================================================
// EDGE FUNCTION: criar-cobranca-pix
//
// Chamada pelo totem logo depois que criar-pedido devolve o
// pedido_id. Gera o QR code Pix (Mercado Pago) para aquele pedido,
// com o valor JA CALCULADO E GRAVADO por criar-pedido — nunca
// recalculado nem recebido do totem aqui (REGRA 2 por outro caminho).
//
// Fica separada de criar-pedido de proposito: criar-pedido apaga o
// pedido inteiro se qualquer parte falhar, e uma falha de rede
// passageira falando com o Mercado Pago nao pode apagar um pedido
// valido, com total ja gravado.
//
// Entrada esperada (POST, JSON): { "slug": "adoravelburguer", "pedido_id": "uuid" }
// Saida: { "qr_code": "...", "qr_code_base64": "...", "expira_em": "..." }
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { criarPagamentoPix } from '../_shared/mercadopago.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

class ErroCobranca extends Error {
  status: number
  constructor(mensagem: string, status = 400) {
    super(mensagem)
    this.status = status
  }
}

const ehUuid = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405)

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  try {
    let corpo: Record<string, unknown>
    try {
      corpo = await req.json()
    } catch {
      throw new ErroCobranca('Corpo da requisição não é um JSON válido.')
    }

    const slug = typeof corpo.slug === 'string' ? corpo.slug.trim().slice(0, 60) : ''
    if (!slug) throw new ErroCobranca('Informe o slug do estabelecimento.')
    if (!ehUuid(corpo.pedido_id)) throw new ErroCobranca('Informe o pedido.')

    const { data: estab, error: erroEstab } = await sb
      .from('estabelecimentos')
      .select('id, config')
      .eq('slug', slug)
      .maybeSingle()
    if (erroEstab) throw erroEstab
    if (!estab) throw new ErroCobranca('Estabelecimento não encontrado.', 404)

    const accessToken = (estab.config as Record<string, unknown> | null)?.mercado_pago_access_token
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new ErroCobranca('Pix indisponível no momento. Chame um atendente.', 503)
    }

    const { data: pedido, error: erroPedido } = await sb
      .from('pedidos')
      .select('id, total, pago')
      .eq('id', corpo.pedido_id)
      .eq('estabelecimento_id', estab.id)
      .maybeSingle()
    if (erroPedido) throw erroPedido
    if (!pedido) throw new ErroCobranca('Pedido não encontrado.', 404)
    if (pedido.pago) throw new ErroCobranca('Pedido já está pago.', 409)

    const notificationUrl =
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-mercadopago` +
      `?estabelecimento_id=${estab.id}`

    const pagamento = await criarPagamentoPix({
      accessToken,
      valor: pedido.total,
      pedidoId: pedido.id,
      notificationUrl,
    })

    const { error: erroUpdate } = await sb
      .from('pedidos')
      .update({ pix_pagamento_id: String(pagamento.id) })
      .eq('id', pedido.id)
    if (erroUpdate) throw erroUpdate

    const dados = pagamento.point_of_interaction?.transaction_data
    if (!dados?.qr_code || !dados?.qr_code_base64) {
      throw new ErroCobranca('Mercado Pago não devolveu o QR code.', 502)
    }

    return resposta({
      qr_code: dados.qr_code,
      qr_code_base64: dados.qr_code_base64,
    })
  } catch (e) {
    if (e instanceof ErroCobranca) {
      return resposta({ erro: e.message }, e.status)
    }
    console.error('criar-cobranca-pix falhou:', e)
    return resposta({ erro: 'Não foi possível gerar o Pix. Tente novamente.' }, 500)
  }
})
