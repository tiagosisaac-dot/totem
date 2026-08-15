// ============================================================
// EDGE FUNCTION: verificar-heartbeat
//
// Chamada pelo pg_cron a cada minuto (migracao 006). Confere se
// algum totem de estabelecimento ativo, que aceita pedidos, parou
// de mandar sinal — e avisa uma unica vez por queda: alertado_em
// trava o reenvio ate o ping voltar (que zera o campo).
//
// So considera estabelecimento ativo e aceitando pedidos: se o
// dono pausou o totem de proposito, silencio nao e queda.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { avisar } from '../_shared/telegram.ts'

const MINUTOS_SEM_SINAL = 3

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const limite = new Date(Date.now() - MINUTOS_SEM_SINAL * 60_000).toISOString()

  const { data: caidos, error } = await sb
    .from('totem_heartbeat')
    .select('estabelecimento_id, ultimo_ping, estabelecimentos!inner(nome, ativo, aceita_pedidos)')
    .lt('ultimo_ping', limite)
    .is('alertado_em', null)
    .eq('estabelecimentos.ativo', true)
    .eq('estabelecimentos.aceita_pedidos', true)

  if (error) {
    console.error('Falha ao consultar heartbeat:', error)
    return new Response(JSON.stringify({ erro: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  for (const linha of caidos ?? []) {
    const nome = (linha as { estabelecimentos?: { nome?: string } }).estabelecimentos?.nome
      ?? linha.estabelecimento_id
    await avisar(`🔴 Totem de ${nome} sem sinal há mais de ${MINUTOS_SEM_SINAL} minutos.`)
    await sb
      .from('totem_heartbeat')
      .update({ alertado_em: new Date().toISOString() })
      .eq('estabelecimento_id', linha.estabelecimento_id)
  }

  return new Response(JSON.stringify({ ok: true, avisados: caidos?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
