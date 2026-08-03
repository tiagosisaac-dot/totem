// ============================================================
// LOGIN — usado pela cozinha e pelo painel do dono
//
// Diferente do totem, que nao tem login: pedidos so podem ser
// lidos por quem esta autenticado, senao qualquer um no wi-fi da
// loja veria todos os pedidos (e os de outras lanchonetes).
//
// Quem decide o que essa pessoa pode ver e o BANCO, pelas policies
// de RLS. Aqui so entregamos o cracha.
// ============================================================

import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login({ titulo, corTexto, corFundo }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(evento) {
    evento.preventDefault()
    setEntrando(true)
    setErro(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error) {
      // mensagem generica de proposito: nao contamos se o e-mail
      // existe ou se foi so a senha que errou
      console.error('Falha no login:', error)
      setErro('E-mail ou senha incorretos.')
      setEntrando(false)
      return
    }
    // deu certo: quem observa a sessao troca a tela sozinho
  }

  return (
    <div
      className="flex h-full items-center justify-center p-6"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <form onSubmit={entrar} className="flex w-full max-w-lg flex-col gap-5">
        <h1 className="text-4xl font-black">{titulo}</h1>

        {erro && (
          <p
            className="rounded-2xl px-6 py-4 text-2xl font-bold"
            style={{ backgroundColor: corTexto, color: corFundo }}
          >
            {erro}
          </p>
        )}

        <label className="flex flex-col gap-2 text-xl font-bold">
          E-mail
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[64px] rounded-2xl border-4 px-5 text-2xl font-normal"
            style={{ borderColor: `${corTexto}44`, color: corTexto }}
          />
        </label>

        <label className="flex flex-col gap-2 text-xl font-bold">
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="min-h-[64px] rounded-2xl border-4 px-5 text-2xl font-normal"
            style={{ borderColor: `${corTexto}44`, color: corTexto }}
          />
        </label>

        <button
          type="submit"
          disabled={entrando}
          className="mt-2 min-h-[72px] rounded-2xl text-2xl font-black disabled:opacity-50 active:enabled:scale-95"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
