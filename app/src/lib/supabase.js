// ============================================================
// CONEXAO COM O BANCO
//
// A chave 'anon' e publica de proposito: ela nao da permissao
// nenhuma por si. Quem decide o que pode ser lido ou escrito sao
// as policies de RLS no banco.
//
// A chave 'service_role' (de administrador) NUNCA entra aqui.
// Ela vive so dentro da Edge Function.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !chaveAnon) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. ' +
      'Confira o arquivo app/.env.local e reinicie o servidor.',
  )
}

export const supabase = createClient(url, chaveAnon)
