// ============================================================
// ENDERECOS DO SISTEMA
//
// Um codigo so serve os destinos abaixo. O que muda e o endereco:
//   /adoravelburguer            -> totem do salao
//   /adoravelburguer/impressora -> imprime o pedido na cozinha (QZ Tray)
//   /adoravelburguer/admin      -> painel do dono
//
// O 'slug' na frente e o que identifica de qual estabelecimento a
// tela esta falando. Nenhum nome de loja aparece aqui (REGRA 1).
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Totem from './paginas/Totem.jsx'
import Impressora from './paginas/Impressora.jsx'
import Admin from './paginas/Admin.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:slug" element={<Totem />} />
        <Route path="/:slug/impressora" element={<Impressora />} />
        <Route path="/:slug/admin" element={<Admin />} />
        <Route path="*" element={<EnderecoInvalido />} />
      </Routes>
    </BrowserRouter>
  )
}

// Acontece quando alguem abre a raiz do site sem informar a loja.
function EnderecoInvalido() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl font-bold">Endereço inválido</p>
      <p className="text-2xl opacity-60">Cada estabelecimento tem seu próprio endereço.</p>
    </div>
  )
}
