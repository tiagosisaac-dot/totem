// ============================================================
// Unico lugar do projeto que fala com a API do Mercado Pago.
//
// Cada estabelecimento usa o PROPRIO token (estabelecimentos.config.
// mercado_pago_access_token) — o dinheiro cai direto na conta dele,
// nunca passa por uma conta que o Isaac controla (evita o sistema
// virar "marketplace"/intermediador de pagamento, com todas as
// obrigacoes regulatorias que isso traz).
//
// Desde 10/09/2026, o token de cada estabelecimento vem de OAuth (o
// dono clica "Conectar Mercado Pago" — ver conectar-mercadopago e
// callback-oauth-mercadopago) em vez de colado a mao. OAuth e "split
// de pagamento" sao recursos SEPARADOS no Mercado Pago — usar OAuth
// so pra pegar o token de cada vendedor, sem nenhum parametro de
// divisao, mantem o dinheiro indo 100% pra conta de cada um.
// ============================================================

const API = 'https://api.mercadopago.com'

type PagamentoPix = {
  id: number
  status: string
  transaction_amount: number
  external_reference: string | null
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
    }
  }
}

// Cria uma cobranca Pix (QR code dinamico, valor fixo, uso unico).
// Idempotency-Key com o id do pedido: um reenvio de rede/clique nao
// gera duas cobrancas do mesmo pedido.
export async function criarPagamentoPix({
  accessToken,
  valor,
  pedidoId,
  notificationUrl,
}: {
  accessToken: string
  valor: string
  pedidoId: string
  notificationUrl: string
}): Promise<PagamentoPix> {
  const expira = new Date(Date.now() + 15 * 60_000).toISOString()

  const resp = await fetch(`${API}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': pedidoId,
    },
    body: JSON.stringify({
      payment_method_id: 'pix',
      transaction_amount: Number(valor),
      description: 'Pedido Totem',
      external_reference: pedidoId,
      notification_url: notificationUrl,
      date_of_expiration: expira,
      // Mercado Pago exige payer.email mesmo sem cliente cadastrado, e
      // recusa dominios "reservados" tipo .invalid — confirmado testando
      // direto na API (01/09/2026). example.com passa na validacao.
      payer: { email: `pedido-${pedidoId}@example.com` },
    }),
  })

  if (!resp.ok) {
    const detalhe = await resp.text()
    throw new Error(`Mercado Pago recusou a cobrança (${resp.status}): ${detalhe}`)
  }

  return (await resp.json()) as PagamentoPix
}

// Busca o pagamento DE VOLTA na API — nunca confiar no corpo que uma
// notificacao de webhook mandou, so no que o Mercado Pago confirma
// quando perguntado direto.
export async function consultarPagamento({
  accessToken,
  pagamentoId,
}: {
  accessToken: string
  pagamentoId: string
}): Promise<PagamentoPix> {
  const resp = await fetch(`${API}/v1/payments/${pagamentoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!resp.ok) {
    const detalhe = await resp.text()
    throw new Error(`Falha ao consultar pagamento (${resp.status}): ${detalhe}`)
  }

  return (await resp.json()) as PagamentoPix
}

type RespostaToken = {
  access_token: string
  refresh_token: string
  expires_in: number
  user_id?: number | string
  [chave: string]: unknown
}

// ---- OAuth: troca o "code" do redirect por access_token + refresh_token ----
// client_id/client_secret sao da aplicacao do ISAAC (plataforma), nunca do
// estabelecimento — vivem como segredo de Edge Function (MERCADO_PAGO_*).
export async function trocarCodigoPorToken({
  code,
  redirectUri,
}: {
  code: string
  redirectUri: string
}): Promise<RespostaToken> {
  const resp = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('MERCADO_PAGO_CLIENT_ID'),
      client_secret: Deno.env.get('MERCADO_PAGO_CLIENT_SECRET'),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!resp.ok) {
    throw new Error(`Falha ao trocar code por token (${resp.status}): ${await resp.text()}`)
  }
  return (await resp.json()) as RespostaToken
}

// ---- Renova o access_token usando o refresh_token guardado. O
// refresh_token TROCA a cada renovacao — sempre grava os dois de novo. ----
async function renovarToken({
  refreshToken,
}: {
  refreshToken: string
}): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const resp = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('MERCADO_PAGO_CLIENT_ID'),
      client_secret: Deno.env.get('MERCADO_PAGO_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!resp.ok) {
    throw new Error(`Falha ao renovar token do Mercado Pago (${resp.status}): ${await resp.text()}`)
  }
  return (await resp.json()) as { access_token: string; refresh_token: string; expires_in: number }
}

// ---- Fallback: se a resposta do token nao trouxer o user_id do
// vendedor direto, busca na API (usado no callback do OAuth). ----
export async function buscarUsuarioMp({
  accessToken,
}: {
  accessToken: string
}): Promise<{ id: number; [chave: string]: unknown }> {
  const resp = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!resp.ok) throw new Error(`Falha ao buscar usuário do Mercado Pago (${resp.status})`)
  return (await resp.json()) as { id: number; [chave: string]: unknown }
}

// ---- Garante que o token de um estabelecimento esta valido antes de
// cobrar; renova e regrava no banco se estiver perto de vencer. Chamada
// reativa (a cada cobranca), sem cron separado: pedido normal do dia a
// dia renova bem antes dos ~180 dias de validade. Estabelecimento com
// ZERO pedidos por 180+ dias fica com token velho ate o proximo pedido
// tentar — risco aceito pro tamanho do piloto. ----
export async function garantirTokenValido(
  // deno-lint-ignore no-explicit-any
  sb: any,
  estab: { id: string; config: Record<string, unknown> | null },
): Promise<string | null> {
  const config = estab.config ?? {}
  const accessToken = config.mercado_pago_access_token as string | undefined
  const refreshToken = config.mercado_pago_refresh_token as string | undefined
  const expiraEmStr = config.mercado_pago_token_expira_em as string | undefined

  if (!accessToken) return null // nunca conectou

  // token sem refresh_token/validade guardada: usa do jeito que esta
  if (!refreshToken || !expiraEmStr) return accessToken

  const MARGEM_MS = 24 * 60 * 60_000 // renova com 1 dia de folga antes de vencer
  if (new Date(expiraEmStr).getTime() - Date.now() > MARGEM_MS) return accessToken

  try {
    const novo = await renovarToken({ refreshToken })
    const novaExpira = new Date(Date.now() + novo.expires_in * 1000).toISOString()
    await sb
      .from('estabelecimentos')
      .update({
        config: {
          ...config,
          mercado_pago_access_token: novo.access_token,
          mercado_pago_refresh_token: novo.refresh_token,
          mercado_pago_token_expira_em: novaExpira,
        },
      })
      .eq('id', estab.id)
    return novo.access_token
  } catch (e) {
    console.error('garantirTokenValido: falha ao renovar, seguindo com o token atual:', e)
    return accessToken
  }
}
