// ============================================================
// Unico lugar do projeto que fala com a API do Mercado Pago.
//
// Cada estabelecimento usa o PROPRIO token (estabelecimentos.config.
// mercado_pago_access_token) — o dinheiro cai direto na conta dele,
// nunca passa por uma conta que o Isaac controla (evita o sistema
// virar "marketplace"/intermediador de pagamento, com todas as
// obrigacoes regulatorias que isso traz).
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
