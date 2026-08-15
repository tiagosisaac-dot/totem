// ============================================================
// HEARTBEAT — o totem manda "estou vivo" sozinho, a cada minuto
//
// Nao mostra nada na tela do cliente. Serve so para o Isaac saber
// se um totem caiu antes do dono ligar reclamando (ver Edge
// Function "verificar-heartbeat", que confere isso e avisa pelo
// Telegram).
// ============================================================

import { useEffect } from 'react'
import { supabase } from './supabase.js'

const INTERVALO_MS = 60_000

export function useHeartbeat(slug) {
  useEffect(() => {
    if (!slug) return

    function enviar() {
      supabase.functions.invoke('ping', { body: { slug } }).catch((erro) => {
        console.error('Falha ao mandar sinal de vida do totem:', erro)
      })
    }

    enviar()
    const id = setInterval(enviar, INTERVALO_MS)
    return () => clearInterval(id)
  }, [slug])
}
