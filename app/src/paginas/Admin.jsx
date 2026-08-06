// ============================================================
// PAINEL DO DONO — esgotar/reativar item e mudar preço
//
// Escopo fechado da Fase 1: só estas duas coisas. Cadastro de
// cardápio é feito por Isaac no onboarding.
//
// Mudar preço aqui NÃO altera venda passada: cada pedido guarda
// cópia do nome e do preço (REGRA 3). O dono pode reajustar sem
// medo de reescrever o histórico.
//
// Preço não salva sozinho ao sair do campo: um toque acidental não
// pode virar reajuste. Aparece "Salvar" quando o valor muda.
// ============================================================

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useLojaLogada } from '../lib/useLojaLogada.js'
import { sair } from '../lib/sessao.js'
import { emReais } from '../lib/formato.js'
import Login from '../componentes/Login.jsx'
import { ALERTA, Cabecalho, Recado } from '../componentes/PainelComuns.jsx'

const PAPEIS_PERMITIDOS = ['dono', 'superadmin']

export default function Admin() {
  const { slug } = useParams()
  const { sessao, carregandoSessao, loja, papel, acesso, corTexto, corFundo } = useLojaLogada(slug)

  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const liberado = acesso === 'liberado' && PAPEIS_PERMITIDOS.includes(papel)

  useEffect(() => {
    if (!liberado || !loja) return
    let cancelado = false

    async function carregarCardapio() {
      setCarregando(true)

      const [respCategorias, respProdutos] = await Promise.all([
        supabase
          .from('categorias')
          .select('id, nome, ordem')
          .eq('estabelecimento_id', loja.id)
          .order('ordem'),
        supabase
          .from('produtos')
          .select('id, categoria_id, nome, preco, disponivel, ordem')
          .eq('estabelecimento_id', loja.id)
          .order('ordem'),
      ])

      if (cancelado) return

      if (respCategorias.error || respProdutos.error) {
        console.error('Falha ao carregar o cardápio:', respCategorias.error || respProdutos.error)
        setErro('Não foi possível carregar o cardápio.')
        setCarregando(false)
        return
      }

      setCategorias(respCategorias.data)
      setProdutos(respProdutos.data)
      setCarregando(false)
    }

    carregarCardapio()
    return () => {
      cancelado = true
    }
  }, [liberado, loja])

  async function salvar(produto, mudanca) {
    const anterior = produtos
    setErro(null)

    // muda na tela na hora; se o banco recusar, volta atras
    setProdutos((atual) => atual.map((p) => (p.id === produto.id ? { ...p, ...mudanca } : p)))

    const { error } = await supabase.from('produtos').update(mudanca).eq('id', produto.id)

    if (error) {
      console.error('Falha ao salvar:', error)
      setProdutos(anterior)
      setErro(`Não foi possível salvar "${produto.nome}". Tente novamente.`)
      return false
    }
    return true
  }

  // ---- telas de bloqueio ----
  if (carregandoSessao || !loja) {
    return <Recado texto="Carregando..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (!sessao) {
    return <Login titulo={`Painel — ${loja.nome}`} corTexto={corTexto} corFundo={corFundo} />
  }

  if (acesso === 'verificando') {
    return <Recado texto="Verificando acesso..." corTexto={corTexto} corFundo={corFundo} />
  }

  if (acesso === 'negado') {
    return (
      <Recado
        texto="Sem acesso a esta loja"
        detalhe="Este usuário pertence a outro estabelecimento."
        corTexto={corTexto}
        corFundo={corFundo}
        aoSair={sair}
      />
    )
  }

  if (!PAPEIS_PERMITIDOS.includes(papel)) {
    return (
      <Recado
        texto="Este painel é do dono"
        detalhe="Entre com o usuário do dono para alterar o cardápio."
        corTexto={corTexto}
        corFundo={corFundo}
        aoSair={sair}
      />
    )
  }

  const esgotados = produtos.filter((p) => !p.disponivel).length

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: corFundo, color: corTexto }}>
      <Cabecalho titulo="Painel" loja={loja} corTexto={corTexto}>
        {esgotados > 0 && (
          <span
            className="ml-auto rounded-xl px-4 py-2 text-xl font-black text-white"
            style={{ backgroundColor: ALERTA }}
          >
            {esgotados} {esgotados === 1 ? 'item esgotado' : 'itens esgotados'}
          </span>
        )}
      </Cabecalho>

      {erro && (
        <p
          className="px-6 py-4 text-xl font-bold text-white"
          style={{ backgroundColor: ALERTA }}
          role="alert"
        >
          {erro}
        </p>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: 'contain' }}>
        {carregando ? (
          <p className="mt-12 text-center text-3xl opacity-60">Carregando cardápio...</p>
        ) : produtos.length === 0 ? (
          <p className="mt-12 text-center text-3xl opacity-60">Nenhum produto cadastrado.</p>
        ) : (
          categorias.map((categoria) => {
            const daCategoria = produtos.filter((p) => p.categoria_id === categoria.id)
            if (daCategoria.length === 0) return null

            return (
              <section key={categoria.id} className="mb-8">
                <h2 className="mb-3 text-2xl font-black">{categoria.nome}</h2>
                <ul className="flex flex-col gap-3">
                  {daCategoria.map((produto) => (
                    <LinhaProduto
                      key={produto.id}
                      produto={produto}
                      corTexto={corTexto}
                      corFundo={corFundo}
                      aoSalvar={salvar}
                    />
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}

// ------------------------------------------------------------
function LinhaProduto({ produto, corTexto, corFundo, aoSalvar }) {
  // null = o dono nem tocou no campo.  '' = tocou e apagou tudo.
  //
  // Precisam ser sinais DIFERENTES. Usar vazio para as duas coisas
  // faz o campo se restaurar sozinho quando o dono apaga o último
  // dígito — e parece que o primeiro número não apaga.
  const [rascunho, setRascunho] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const precoSalvo = Number(produto.preco).toFixed(2)
  const editando = rascunho !== null
  const mostrado = editando ? rascunho : precoSalvo

  // aceita vírgula: é como se escreve preço em português
  const digitado = mostrado.replace(',', '.')
  const valorNovo = Number(digitado)
  const valido = digitado.trim() !== '' && Number.isFinite(valorNovo) && valorNovo >= 0
  const invalido = editando && rascunho.trim() !== '' && !valido
  const mudou = valido && valorNovo !== Number(produto.preco)

  function desfazer() {
    setRascunho(null)
  }

  async function salvarPreco() {
    if (!mudou) return
    setSalvando(true)
    const deuCerto = await aoSalvar(produto, { preco: valorNovo.toFixed(2) })
    setSalvando(false)
    if (deuCerto) setRascunho(null)
  }

  return (
    <li
      className="flex flex-wrap items-center gap-4 rounded-2xl border-4 p-4"
      style={{ borderColor: `${corTexto}22`, opacity: produto.disponivel ? 1 : 0.55 }}
    >
      <p className="min-w-0 flex-1 text-2xl font-bold">{produto.nome}</p>

      {/* preço */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold opacity-60">R$</span>
        <input
          inputMode="decimal"
          value={mostrado}
          onFocus={(e) => {
            // Seleciona tudo ao tocar: quem não tem prática digita o
            // valor novo por cima, em vez de apagar dígito por dígito.
            // O texto do rascunho é igual ao que já estava na tela, então
            // a seleção sobrevive à re-renderização.
            if (rascunho === null) setRascunho(precoSalvo)
            e.target.select()
          }}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') salvarPreco()
            if (e.key === 'Escape') desfazer()
          }}
          className="min-h-[60px] w-32 rounded-xl border-4 px-3 text-2xl font-bold"
          style={{ borderColor: mudou ? corTexto : `${corTexto}33`, color: corTexto }}
          aria-label={`Preço de ${produto.nome}`}
        />
      </div>

      {/* só aparece quando o valor realmente mudou: toque acidental
          no campo não pode virar reajuste de preço */}
      {mudou && (
        <button
          onClick={salvarPreco}
          disabled={salvando}
          className="min-h-[60px] rounded-xl px-6 text-xl font-black disabled:opacity-50 active:enabled:scale-95"
          style={{ backgroundColor: corTexto, color: corFundo }}
        >
          {salvando ? 'Salvando...' : `Salvar ${emReais(valorNovo)}`}
        </button>
      )}

      {/* saída sem risco para quem se perdeu no meio da digitação */}
      {editando && mostrado !== precoSalvo && !salvando && (
        <button
          onClick={desfazer}
          className="min-h-[60px] rounded-xl border-4 px-5 text-xl font-bold active:scale-95"
          style={{ borderColor: `${corTexto}44` }}
        >
          Desfazer
        </button>
      )}

      {invalido && <span className="text-lg font-bold opacity-60">valor inválido</span>}

      {/* esgotar / reativar */}
      <button
        onClick={() => aoSalvar(produto, { disponivel: !produto.disponivel })}
        className="min-h-[60px] w-44 rounded-xl text-xl font-black active:scale-95"
        style={
          produto.disponivel
            ? { border: `4px solid ${corTexto}`, color: corTexto }
            : { backgroundColor: ALERTA, color: '#FFFFFF' }
        }
      >
        {produto.disponivel ? 'Disponível' : 'Esgotado'}
      </button>
    </li>
  )
}
