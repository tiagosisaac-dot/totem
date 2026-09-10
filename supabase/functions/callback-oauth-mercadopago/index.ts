// ============================================================
// EDGE FUNCTION: callback-oauth-mercadopago
//
// Recebida do NAVEGADOR (redirect do Mercado Pago depois que o dono
// autoriza), nao do totem nem de servidor a servidor — publicada com
// verificacao de JWT desligada, igual webhook-mercadopago, porque o
// Mercado Pago nao manda token do Supabase nessa chamada.
//
// "state" e o estabelecimento_id (mandado por conectar-mercadopago).
// Simplificacao consciente pra um piloto pequeno: nao e um token de
// uso unico com validade curta, so o id direto. O pior cenario e um
// estabelecimento ficar ligado a aplicacao errada — nao vazamento de
// dinheiro nem dado sensivel, ja que quem finaliza a autorizacao
// sempre loga na PROPRIA conta Mercado Pago. Ver CLAUDE.md.
//
// Entrada: GET ?code=...&state=<estabelecimento_id> (ou ?error=...)
// Saida: redireciona pro /:slug/admin?mp=conectado ou ?mp=erro
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { trocarCodigoPorToken, buscarUsuarioMp } from '../_shared/mercadopago.ts'

function redirecionar(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const erroAutorizacao = url.searchParams.get('error')

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://totem-vert.vercel.app'

  if (!state) return redirecionar(`${siteUrl}?mp=erro`) // sem estabelecimento, sem pra onde voltar

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: estab } = await sb
    .from('estabelecimentos')
    .select('id, slug, config')
    .eq('id', state)
    .maybeSingle()
  if (!estab) return redirecionar(`${siteUrl}?mp=erro`)

  const voltarPara = (status: string) => redirecionar(`${siteUrl}/${estab.slug}/admin?mp=${status}`)

  if (erroAutorizacao || !code) return voltarPara('erro')

  try {
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-oauth-mercadopago`
    const token = await trocarCodigoPorToken({ code, redirectUri })

    // a resposta do /oauth/token deveria trazer o user_id do vendedor
    // direto — se um dia parar de trazer, busca na API como reserva
    let userId = token.user_id
    if (!userId) {
      const usuario = await buscarUsuarioMp({ accessToken: token.access_token })
      userId = usuario.id
    }

    const expiraEm = new Date(Date.now() + token.expires_in * 1000).toISOString()

    await sb
      .from('estabelecimentos')
      .update({
        config: {
          ...((estab.config as Record<string, unknown>) ?? {}),
          mercado_pago_access_token: token.access_token,
          mercado_pago_refresh_token: token.refresh_token,
          mercado_pago_token_expira_em: expiraEm,
          mercado_pago_user_id: String(userId),
        },
      })
      .eq('id', estab.id)

    return voltarPara('conectado')
  } catch (e) {
    console.error('callback-oauth-mercadopago falhou:', e)
    return voltarPara('erro')
  }
})
