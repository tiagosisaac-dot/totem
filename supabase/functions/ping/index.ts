// ============================================================
// EDGE FUNCTION: ping
//
// O totem manda isso sozinho a cada minuto (ver useHeartbeat no
// front), sem o cliente perceber. So atualiza "a que horas foi o
// ultimo sinal" — nao mexe em pedido nem em cardapio.
//
// Se o totem estava marcado como caido (alertado_em preenchido) e
// voltou a mandar sinal, avisa que voltou. Fecha o ciclo do aviso:
// quem recebeu "caiu" tambem recebe "voltou".
//
// Entrada esperada (POST, JSON): { "slug": "adoravelburguer" }
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { avisar } from '../_shared/telegram.ts'

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

  const { data: loja } = await sb
    .from('estabelecimentos')
    .select('id, nome')
    .eq('slug', slug)
    .maybeSingle()

  if (!loja) return resposta({ erro: 'Estabelecimento não encontrado.' }, 404)

  const { data: anterior } = await sb
    .from('totem_heartbeat')
    .select('alertado_em')
    .eq('estabelecimento_id', loja.id)
    .maybeSingle()

  await sb.from('totem_heartbeat').upsert({
    estabelecimento_id: loja.id,
    ultimo_ping: new Date().toISOString(),
    alertado_em: null,
  })

  if (anterior?.alertado_em) {
    await avisar(`✅ Totem de ${loja.nome} voltou a responder.`)
  }

  return resposta({ ok: true })
})
