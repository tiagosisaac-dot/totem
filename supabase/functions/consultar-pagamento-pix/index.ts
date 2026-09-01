// ============================================================
// EDGE FUNCTION: consultar-pagamento-pix
//
// O totem chama isso em loop (a cada ~3s) enquanto mostra o QR code,
// esperando o Pix confirmar. So devolve um booleano — nao fala com o
// Mercado Pago (quem atualiza pedidos.pago e o webhook-mercadopago).
//
// Existe pra nao precisar abrir RLS de "select" em pedidos pro anon:
// isso vazaria nome e valor de TODOS os pedidos da loja pra qualquer
// aparelho com a chave publica do site. Uma funcao burra que so
// devolve {pago} pra um pedido_id especifico evita isso.
//
// Entrada esperada (POST, JSON): { "slug": "adoravelburguer", "pedido_id": "uuid" }
// Saida: { "pago": boolean }
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

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

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return resposta({ erro: 'Corpo da requisição não é um JSON válido.' }, 400)
  }

  const slug = typeof corpo.slug === 'string' ? corpo.slug.trim().slice(0, 60) : ''
  if (!slug) return resposta({ erro: 'Informe o slug do estabelecimento.' }, 400)
  if (!ehUuid(corpo.pedido_id)) return resposta({ erro: 'Informe o pedido.' }, 400)

  const { data: estab } = await sb.from('estabelecimentos').select('id').eq('slug', slug).maybeSingle()
  if (!estab) return resposta({ erro: 'Estabelecimento não encontrado.' }, 404)

  const { data: pedido, error } = await sb
    .from('pedidos')
    .select('pago')
    .eq('id', corpo.pedido_id)
    .eq('estabelecimento_id', estab.id)
    .maybeSingle()

  if (error) {
    console.error('Falha ao consultar pagamento:', error)
    return resposta({ erro: 'Falha ao consultar pagamento.' }, 500)
  }
  if (!pedido) return resposta({ erro: 'Pedido não encontrado.' }, 404)

  return resposta({ pago: pedido.pago === true })
})
