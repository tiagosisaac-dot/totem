// ============================================================
// EDGE FUNCTION: webhook-mercadopago
//
// Recebida do Mercado Pago (servidor a servidor), nao do totem —
// e a UNICA funcao deste projeto que aceita chamada anonima de fora
// do sistema. Precisa ser publicada com verificacao de JWT desligada
// (o Mercado Pago nao manda token do Supabase).
//
// Desde 10/09/2026 (migracao pra OAuth): a loja e identificada pelo
// user_id que vem no CORPO da notificacao, comparado com
// estabelecimentos.config.mercado_pago_user_id (gravado por
// callback-oauth-mercadopago quando o dono conecta a conta). A
// assinatura e validada com o segredo UNICO da plataforma
// (MERCADO_PAGO_WEBHOOK_SECRET — antes era um segredo por
// estabelecimento, agora e so um, porque so existe uma aplicacao
// Mercado Pago, a do Isaac).
//
// Fallback temporario: se a notificacao ainda vier com
// ?estabelecimento_id= na URL (formato antigo, de uma cobranca gerada
// antes desta mudanca), usa isso pra achar a loja. Remover esse
// fallback quando nao houver mais estabelecimento no modelo antigo.
//
// Nunca confia no corpo da notificacao pra saber se pagou: so serve
// pra "avisar que aconteceu algo", o status de verdade vem sempre de
// consultarPagamento (GET /v1/payments/{id} de volta na API).
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { consultarPagamento } from '../_shared/mercadopago.ts'

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Formato do header: "ts=1704908010,v1=618c853452..."
function lerAssinatura(header: string | null) {
  const partes = new Map<string, string>()
  for (const trecho of (header ?? '').split(',')) {
    const [chave, valor] = trecho.split('=')
    if (chave && valor) partes.set(chave.trim(), valor.trim())
  }
  return { ts: partes.get('ts'), v1: partes.get('v1') }
}

async function assinaturaValida(
  segredo: string,
  dataId: string,
  requestId: string,
  ts: string,
  v1: string,
) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const assinado = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifest))
  const hex = [...new Uint8Array(assinado)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === v1
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405)

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return resposta({ ok: true }) // corpo ilegivel: ignora, sem pedir reenvio
  }

  if (corpo.type !== 'payment') return resposta({ ok: true }) // so nos importa notificacao de pagamento

  const dataId = (corpo.data as Record<string, unknown> | undefined)?.id
  if (typeof dataId !== 'string' && typeof dataId !== 'number') return resposta({ ok: true })

  // Acha a loja pelo user_id da notificacao (modelo OAuth). Fallback:
  // ?estabelecimento_id= na URL, so pra cobranca gerada antes da
  // migracao pra OAuth — remover quando nao sobrar mais nenhuma.
  const userId = corpo.user_id
  const estabelecimentoIdAntigo = new URL(req.url).searchParams.get('estabelecimento_id')

  let estab: { id: string; config: Record<string, unknown> | null } | null = null
  if (userId !== undefined && userId !== null) {
    const { data } = await sb
      .from('estabelecimentos')
      .select('id, config')
      .eq('config->>mercado_pago_user_id', String(userId))
      .maybeSingle()
    estab = data
  }
  if (!estab && estabelecimentoIdAntigo) {
    const { data } = await sb
      .from('estabelecimentos')
      .select('id, config')
      .eq('id', estabelecimentoIdAntigo)
      .maybeSingle()
    estab = data
  }
  if (!estab) return resposta({ ok: true }) // sem como identificar a loja: ignora

  const config = estab.config
  const accessToken = config?.mercado_pago_access_token
  const segredoWebhook = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')
  if (typeof accessToken !== 'string' || !segredoWebhook) {
    console.error('webhook-mercadopago: estabelecimento sem credenciais configuradas', estab.id)
    return resposta({ ok: true })
  }

  // ---- valida que a notificacao realmente veio do Mercado Pago ----
  const { ts, v1 } = lerAssinatura(req.headers.get('x-signature'))
  const requestId = req.headers.get('x-request-id') ?? ''
  if (!ts || !v1 || !(await assinaturaValida(segredoWebhook, String(dataId), requestId, ts, v1))) {
    console.error('webhook-mercadopago: assinatura invalida', estab.id)
    return resposta({ ok: true }) // 200 sem processar: nunca da pista de por que falhou
  }

  // ---- busca o pagamento DE VERDADE na API, nunca confia no corpo ----
  let pagamento
  try {
    pagamento = await consultarPagamento({ accessToken, pagamentoId: String(dataId) })
  } catch (e) {
    console.error('webhook-mercadopago: falha ao consultar pagamento', e)
    return resposta({ erro: 'Falha ao consultar pagamento.' }, 500) // aqui sim pede reenvio: pode ter sido rede
  }

  if (pagamento.status !== 'approved') return resposta({ ok: true })
  if (!pagamento.external_reference) return resposta({ ok: true })

  // ---- sanidade extra: valor bate com o que foi cobrado (REGRA 2 por outro caminho) ----
  const { data: pedido } = await sb
    .from('pedidos')
    .select('id, total')
    .eq('id', pagamento.external_reference)
    .eq('estabelecimento_id', estab.id)
    .maybeSingle()

  if (!pedido) return resposta({ ok: true })
  if (Number(pedido.total) !== Number(pagamento.transaction_amount)) {
    console.error('webhook-mercadopago: valor do pagamento nao bate com o pedido', pedido.id)
    return resposta({ ok: true })
  }

  // ---- confirma. "and pago=false" e a trava de idempotencia — o
  // Mercado Pago reenvia notificacao se nao receber 200 rapido ----
  await sb
    .from('pedidos')
    .update({ pago: true, pago_em: new Date().toISOString() })
    .eq('id', pedido.id)
    .eq('pago', false)

  return resposta({ ok: true })
})
