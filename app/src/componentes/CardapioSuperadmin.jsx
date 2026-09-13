// ============================================================
// EDITAR CARDAPIO DE UMA LOJA — usado dentro do /superadmin
//
// Fase A: categoria e produto (nome, descricao, preco, disponivel,
// vendavel sozinho, foto). Combo e grupo de opcao reutilizavel ficam
// pra depois (dependem de policy de escrita que ainda nao existe pra
// combo_slots/combo_slot_produtos).
//
// Nao muda nada do /:slug/admin do dono — essa tela e so pro Isaac,
// via /superadmin.
// ============================================================

import { useState } from 'react'
import { useCardapioAdmin } from '../lib/useCardapioAdmin.js'
import { emReais } from '../lib/formato.js'
import { ALERTA } from './PainelComuns.jsx'

export default function CardapioSuperadmin({ lojaId, lojaNome, aoFechar, corTexto, corFundo }) {
  const {
    categorias,
    produtos,
    carregando,
    erro,
    criarCategoria,
    atualizarCategoria,
    removerCategoria,
    criarProduto,
    atualizarProduto,
    removerProduto,
  } = useCardapioAdmin(lojaId)

  const categoriasOrdenadas = [...categorias].sort((a, b) => a.ordem - b.ordem)
  const semCategoria = produtos.filter((p) => !p.categoria_id)

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <header
        className="flex flex-wrap items-center gap-4 border-b-2 px-6 py-3"
        style={{ borderColor: `${corTexto}22` }}
      >
        <button
          onClick={aoFechar}
          className="min-h-[52px] rounded-xl border-4 px-5 text-xl font-bold active:scale-95"
          style={{ borderColor: `${corTexto}44` }}
        >
          ← Voltar
        </button>
        <h1 className="text-3xl font-black">Cardápio</h1>
        <span className="text-2xl opacity-60">{lojaNome}</span>
      </header>

      <p className="px-6 pt-4 text-lg opacity-70">
        A foto fica melhor parecida com uma foto de produto: mais larga que alta, o produto ocupando a maior
        parte do quadro, fundo claro. A tela do cardápio corta pra esse formato — foto quadrada com muito
        espaço em volta fica pequena/estranha.
      </p>

      {erro && (
        <p className="mx-6 mt-4 rounded-xl px-4 py-3 text-lg font-bold text-white" style={{ backgroundColor: ALERTA }}>
          {erro}
        </p>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
        {carregando ? (
          <p className="mt-12 text-center text-2xl opacity-60">Carregando cardápio...</p>
        ) : (
          <>
            {categoriasOrdenadas.map((categoria) => (
              <CategoriaBloco
                key={categoria.id}
                categoria={categoria}
                produtos={produtos.filter((p) => p.categoria_id === categoria.id).sort((a, b) => a.ordem - b.ordem)}
                lojaId={lojaId}
                corTexto={corTexto}
                aoAtualizarCategoria={atualizarCategoria}
                aoRemoverCategoria={removerCategoria}
                aoCriarProduto={criarProduto}
                aoAtualizarProduto={atualizarProduto}
                aoRemoverProduto={removerProduto}
              />
            ))}

            {semCategoria.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-2xl font-black opacity-70">Sem categoria</h2>
                <ul className="flex flex-col gap-3">
                  {semCategoria.map((produto) => (
                    <ProdutoLinha
                      key={produto.id}
                      produto={produto}
                      corTexto={corTexto}
                      aoSalvar={atualizarProduto}
                      aoRemover={removerProduto}
                    />
                  ))}
                </ul>
              </section>
            )}

            <NovaCategoria corTexto={corTexto} aoCriar={criarCategoria} />
          </>
        )}
      </main>
    </div>
  )
}

// ------------------------------------------------------------
function CategoriaBloco({
  categoria,
  produtos,
  corTexto,
  aoAtualizarCategoria,
  aoRemoverCategoria,
  aoCriarProduto,
  aoAtualizarProduto,
  aoRemoverProduto,
}) {
  const [nome, setNome] = useState(categoria.nome)
  const [mostrarNovoProduto, setMostrarNovoProduto] = useState(false)

  const nomeMudou = nome.trim() !== '' && nome !== categoria.nome

  return (
    <section className="mb-10 rounded-2xl border-4 p-4" style={{ borderColor: `${corTexto}22` }}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="min-h-[52px] flex-1 rounded-xl border-4 px-3 text-2xl font-black"
          style={{ borderColor: corTexto, color: corTexto, backgroundColor: 'transparent' }}
        />
        {nomeMudou && (
          <button
            onClick={() => aoAtualizarCategoria(categoria.id, { nome })}
            className="min-h-[52px] rounded-xl px-5 text-lg font-black"
            style={{ backgroundColor: corTexto, color: '#fff' }}
          >
            Salvar nome
          </button>
        )}
        <button
          onClick={() => aoAtualizarCategoria(categoria.id, { ativa: !categoria.ativa })}
          className="min-h-[52px] rounded-xl border-4 px-4 text-lg font-bold"
          style={
            categoria.ativa
              ? { borderColor: corTexto }
              : { backgroundColor: ALERTA, color: '#fff', borderColor: ALERTA }
          }
        >
          {categoria.ativa ? 'Ativa' : 'Pausada'}
        </button>
        <button
          onClick={() => aoRemoverCategoria(categoria)}
          className="min-h-[52px] rounded-xl border-4 px-4 text-lg font-bold"
          style={{ borderColor: ALERTA, color: ALERTA }}
        >
          Apagar categoria
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {produtos.map((produto) => (
          <ProdutoLinha
            key={produto.id}
            produto={produto}
            corTexto={corTexto}
            aoSalvar={aoAtualizarProduto}
            aoRemover={aoRemoverProduto}
          />
        ))}
      </ul>

      {mostrarNovoProduto ? (
        <NovoProduto
          corTexto={corTexto}
          onCancelar={() => setMostrarNovoProduto(false)}
          aoCriar={async (dados) => {
            const ok = await aoCriarProduto({ ...dados, categoria_id: categoria.id })
            if (ok) setMostrarNovoProduto(false)
            return ok
          }}
        />
      ) : (
        <button
          onClick={() => setMostrarNovoProduto(true)}
          className="mt-4 min-h-[52px] rounded-xl border-4 border-dashed px-5 text-lg font-bold opacity-70"
          style={{ borderColor: corTexto }}
        >
          + Novo produto nesta categoria
        </button>
      )}
    </section>
  )
}

// ------------------------------------------------------------
function ProdutoLinha({ produto, corTexto, aoSalvar, aoRemover }) {
  const [rascunho, setRascunho] = useState({
    nome: produto.nome,
    descricao: produto.descricao || '',
    preco: String(produto.preco),
  })
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const mudou =
    rascunho.nome !== produto.nome ||
    rascunho.descricao !== (produto.descricao || '') ||
    Number(rascunho.preco.replace(',', '.')) !== Number(produto.preco) ||
    arquivo !== null

  async function salvar() {
    setSalvando(true)
    const ok = await aoSalvar(
      produto,
      {
        nome: rascunho.nome,
        descricao: rascunho.descricao || null,
        preco: Number(rascunho.preco.replace(',', '.')).toFixed(2),
      },
      arquivo,
    )
    setSalvando(false)
    if (ok) setArquivo(null)
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border-4 p-4" style={{ borderColor: `${corTexto}22` }}>
      <div className="flex flex-wrap items-center gap-3">
        {produto.imagem_url && (
          <img src={produto.imagem_url} alt="" className="h-16 w-20 rounded-lg object-cover" />
        )}
        <input
          value={rascunho.nome}
          onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
          className="min-w-[160px] flex-1 rounded-xl border-4 px-3 py-2 text-xl font-bold"
          style={{ borderColor: `${corTexto}44`, color: corTexto, backgroundColor: 'transparent' }}
        />
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold opacity-60">R$</span>
          <input
            value={rascunho.preco}
            onChange={(e) => setRascunho((r) => ({ ...r, preco: e.target.value }))}
            inputMode="decimal"
            className="w-24 rounded-xl border-4 px-2 py-2 text-xl font-bold"
            style={{ borderColor: `${corTexto}44`, color: corTexto, backgroundColor: 'transparent' }}
          />
        </div>
        <button
          onClick={() => aoSalvar(produto, { disponivel: !produto.disponivel })}
          className="min-h-[48px] rounded-xl px-4 text-lg font-black"
          style={
            produto.disponivel
              ? { border: `4px solid ${corTexto}`, color: corTexto }
              : { backgroundColor: ALERTA, color: '#fff' }
          }
        >
          {produto.disponivel ? 'Disponível' : 'Esgotado'}
        </button>
        <button
          onClick={() => aoRemover(produto)}
          className="min-h-[48px] rounded-xl border-4 px-4 text-lg font-bold"
          style={{ borderColor: ALERTA, color: ALERTA }}
        >
          Apagar
        </button>
      </div>

      <textarea
        value={rascunho.descricao}
        onChange={(e) => setRascunho((r) => ({ ...r, descricao: e.target.value }))}
        placeholder="Descrição"
        rows={2}
        className="rounded-xl border-4 px-3 py-2 text-base"
        style={{ borderColor: `${corTexto}22`, color: corTexto, backgroundColor: 'transparent' }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        {mudou && (
          <button
            onClick={salvar}
            disabled={salvando}
            className="min-h-[48px] rounded-xl px-5 text-lg font-black disabled:opacity-40"
            style={{ backgroundColor: corTexto, color: '#fff' }}
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        )}
        <span className="text-sm opacity-50">preço atual salvo: {emReais(produto.preco)}</span>
      </div>
    </li>
  )
}

// ------------------------------------------------------------
function NovoProduto({ corTexto, aoCriar, onCancelar }) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [vendavelSozinho, setVendavelSozinho] = useState(true)
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const valido = nome.trim() !== '' && Number(preco.replace(',', '.')) >= 0 && preco.trim() !== ''

  async function criar() {
    setSalvando(true)
    const ok = await aoCriar({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      preco: Number(preco.replace(',', '.')).toFixed(2),
      vendavel_sozinho: vendavelSozinho,
      arquivo,
    })
    setSalvando(false)
    if (ok) {
      setNome('')
      setDescricao('')
      setPreco('')
      setArquivo(null)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border-4 border-dashed p-4" style={{ borderColor: corTexto }}>
      <div className="flex flex-wrap gap-3">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do produto"
          className="min-w-[200px] flex-1 rounded-xl border-4 px-3 py-2 text-xl font-bold"
          style={{ borderColor: `${corTexto}44`, color: corTexto, backgroundColor: 'transparent' }}
        />
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold opacity-60">R$</span>
          <input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="w-24 rounded-xl border-4 px-2 py-2 text-xl font-bold"
            style={{ borderColor: `${corTexto}44`, color: corTexto, backgroundColor: 'transparent' }}
          />
        </div>
      </div>

      <textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição"
        rows={2}
        className="rounded-xl border-4 px-3 py-2 text-base"
        style={{ borderColor: `${corTexto}22`, color: corTexto, backgroundColor: 'transparent' }}
      />

      <label className="flex items-center gap-2 text-lg">
        <input type="checkbox" checked={vendavelSozinho} onChange={(e) => setVendavelSozinho(e.target.checked)} />
        Vendável sozinho (desmarque se esse item só existe dentro de um combo)
      </label>

      <input type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="text-sm" />

      <div className="flex gap-3">
        <button
          onClick={criar}
          disabled={!valido || salvando}
          className="min-h-[52px] rounded-xl px-6 text-lg font-black disabled:opacity-40"
          style={{ backgroundColor: corTexto, color: '#fff' }}
        >
          {salvando ? 'Criando...' : 'Criar produto'}
        </button>
        <button
          onClick={onCancelar}
          disabled={salvando}
          className="min-h-[52px] rounded-xl border-4 px-6 text-lg font-bold disabled:opacity-40"
          style={{ borderColor: `${corTexto}44` }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
function NovaCategoria({ corTexto, aoCriar }) {
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function criar() {
    setSalvando(true)
    const ok = await aoCriar({ nome: nome.trim() })
    setSalvando(false)
    if (ok) setNome('')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border-4 border-dashed p-4" style={{ borderColor: corTexto }}>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da nova categoria"
        className="min-w-[200px] flex-1 rounded-xl border-4 px-3 py-2 text-xl font-bold"
        style={{ borderColor: `${corTexto}44`, color: corTexto, backgroundColor: 'transparent' }}
      />
      <button
        onClick={criar}
        disabled={nome.trim() === '' || salvando}
        className="min-h-[52px] rounded-xl px-6 text-lg font-black disabled:opacity-40"
        style={{ backgroundColor: corTexto, color: '#fff' }}
      >
        {salvando ? 'Criando...' : '+ Nova categoria'}
      </button>
    </div>
  )
}
