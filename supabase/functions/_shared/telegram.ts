// ============================================================
// Unico lugar do projeto que fala com o Telegram. Se um dia trocar
// para WhatsApp ou e-mail, e so reescrever esta funcao — quem chama
// (ping, verificar-heartbeat) nao muda.
// ============================================================

export async function avisar(mensagem: string) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

  if (!token || !chatId) {
    console.error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.')
    return
  }

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: mensagem }),
  })

  if (!resp.ok) {
    console.error('Falha ao mandar aviso no Telegram:', await resp.text())
  }
}
