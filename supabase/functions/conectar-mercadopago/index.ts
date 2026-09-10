// ============================================================
// EDGE FUNCTION: conectar-mercadopago
//
// Chamada pelo botao "Conectar Mercado Pago" no /:slug/admin. Devolve
// a URL de autorizacao do Mercado Pago pro navegador ir direto pra
// la — nunca monta essa URL no frontend.
//
// Por que nao e so um link fixo no React: estabelecimento_id e
// publico (qualquer um ve pelo cardapio). Se o link fosse montado
// livre no navegador, qualquer pessoa poderia trocar o "state" por um
// estabelecimento_id de outra loja e sequestrar a conexao de
// pagamento dela pra propria conta Mercado Pago. Por isso essa funcao
// PRECISA de login (JWT do Supabase) e confere que quem pediu e
// dono/superadmin DAQUELE estabelecimento antes de devolver a URL.
//
// Entrada esperada (POST, JSON, com sessao do dono): { "estabelecimento_id": "uuid" }
// Saida: { "url": "https://auth.mercadopago.com/..." }
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

class ErroConexao extends Error {
  status: number
  constructor(mensagem: string, status = 400) {
    super(mensagem)
    this.status = status
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405)

  try {
    let corpo: Record<string, unknown>
    try {
      corpo = await req.json()
    } catch {
      throw new ErroConexao('Corpo da requisição não é um JSON válido.')
    }

    const estabelecimentoId = corpo.estabelecimento_id
    if (typeof estabelecimentoId !== 'string') {
      throw new ErroConexao('Informe o estabelecimento.')
    }

    // client com a sessao de quem chamou (respeita RLS) — e assim que
    // confirmamos quem esta pedindo, sem precisar confiar no que o
    // corpo da requisicao diz
    const sbUsuario = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )

    const {
      data: { user },
      error: erroUsuario,
    } = await sbUsuario.auth.getUser()
    if (erroUsuario || !user) throw new ErroConexao('Não autenticado.', 401)

    const { data: perfil } = await sbUsuario
      .from('perfis')
      .select('estabelecimento_id, papel')
      .eq('user_id', user.id)
      .maybeSingle()

    const permitido =
      perfil?.papel === 'superadmin' ||
      (perfil?.papel === 'dono' && perfil.estabelecimento_id === estabelecimentoId)
    if (!permitido) throw new ErroConexao('Sem acesso a este estabelecimento.', 403)

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/callback-oauth-mercadopago`
    const url =
      `https://auth.mercadopago.com/authorization` +
      `?response_type=code&client_id=${Deno.env.get('MERCADO_PAGO_CLIENT_ID')}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${estabelecimentoId}&scope=offline_access`

    return resposta({ url })
  } catch (e) {
    if (e instanceof ErroConexao) return resposta({ erro: e.message }, e.status)
    console.error('conectar-mercadopago falhou:', e)
    return resposta({ erro: 'Não foi possível iniciar a conexão.' }, 500)
  }
})
