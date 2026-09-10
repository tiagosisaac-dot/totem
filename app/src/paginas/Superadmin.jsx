// ============================================================
// PAINEL CENTRAL — /superadmin, só o Isaac (papel superadmin)
//
// Diferente do /:slug/admin (um dono vê só a própria loja): aqui vê
// e controla TODOS os estabelecimentos. Hoje só faz uma coisa:
// bloquear/desbloquear o totem de um cliente (inadimplência) — o
// campo `bloqueado` já existia no banco desde o início do projeto,
// só faltava a tela (migração 011 dá a permissão de escrita).
//
// Bloquear é ação que mexe no negócio do cliente — sempre com
// confirmação explícita antes, nunca um clique só (mesmo princípio
// de sempre: nome antes de enviar, preço antes de salvar).
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSessao, sair } from '../lib/sessao.js'
import { useEstatisticasPedidos } from '../lib/useEstatisticas.js'
import Login from '../componentes/Login.jsx'
import SeletorPeriodo, { dataDeHoje, dataDiasAtras, inicioDoDiaIso, fimDoDiaIso } from '../componentes/SeletorPeriodo.jsx'
import { ALERTA, Recado } from '../componentes/PainelComuns.jsx'

const COR_TEXTO = '#111111'
const COR_FUNDO = '#F5F5F5'
const MENSAGEM_PADRAO = 'Sistema temporariamente indisponível.'

export default function Superadmin() {
  const { sessao, carregando: carregandoSessao } = useSessao()
  const [papel, setPapel] = useState(null)
  const [verificandoPapel, setVerificandoPapel] = useState(true)
  const [lojas, setLojas] = useState([])
  const [carregandoLojas, setCarregandoLojas] = useState(true)
  const [dataInicio, setDataInicio] = useState(() => dataDiasAtras(7))
  const [dataFim, setDataFim] = useState(() => dataDeHoje())
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!sessao) {
      setVerificandoPapel(false)
      return
    }
    let cancelado = false
    setVerificandoPapel(true)

    supabase
      .from('perfis')
      .select('papel')
      .eq('user_id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) {
          setPapel(data?.papel ?? null)
          setVerificandoPapel(false)
        }
      })

    return () => {
      cancelado = true
    }
  }, [sessao])

  const liberado = papel === 'superadmin'

  useEffect(() => {
    if (!liberado) return
    let cancelado = false

    supabase
      .from('estabelecimentos')
      .select('id, slug, nome, ativo, bloqueado, mensagem_bloqueio')
      .order('nome')
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) {
          console.error('Falha ao carregar estabelecimentos:', error)
          setErro('Não foi possível carregar a lista de estabelecimentos.')
        } else {
          setLojas(data)
        }
        setCarregandoLojas(false)
      })

    return () => {
      cancelado = true
    }
  }, [liberado])

  // ---- pedidos + quedas do periodo escolhido, por loja — pra medir o
  // piloto (criterio de sucesso do docs/PRD.md: volume estavel/crescendo,
  // desistencia, confiabilidade) ----
  const { porLoja: estatisticas } = useEstatisticasPedidos({
    inicio: liberado ? inicioDoDiaIso(dataInicio) : null,
    fim: liberado ? fimDoDiaIso(dataFim) : null,
  })

  async function alternarBloqueio(loja) {
    const vaiBloquear = !loja.bloqueado
    const pergunta = vaiBloquear
      ? `Bloquear o totem de "${loja.nome}"? O totem para de aceitar pedidos imediatamente.`
      : `Desbloquear o totem de "${loja.nome}"? Volta a aceitar pedidos imediatamente.`
    if (!window.confirm(pergunta)) return

    const anterior = lojas
    setErro(null)
    setLojas((atual) => atual.map((l) => (l.id === loja.id ? { ...l, bloqueado: vaiBloquear } : l)))

    const { error } = await supabase
      .from('estabelecimentos')
      .update({ bloqueado: vaiBloquear })
      .eq('id', loja.id)

    if (error) {
      console.error('Falha ao alterar bloqueio:', error)
      setLojas(anterior)
      setErro(`Não foi possível alterar "${loja.nome}". Tente novamente.`)
    }
  }

  // ---- telas de bloqueio ----
  if (carregandoSessao) {
    return <Recado texto="Carregando..." corTexto={COR_TEXTO} corFundo={COR_FUNDO} />
  }

  if (!sessao) {
    return <Login titulo="Painel central" corTexto={COR_TEXTO} corFundo={COR_FUNDO} />
  }

  if (verificandoPapel) {
    return <Recado texto="Verificando acesso..." corTexto={COR_TEXTO} corFundo={COR_FUNDO} />
  }

  if (!liberado) {
    return (
      <Recado
        texto="Painel reservado"
        detalhe="Esta tela é só para o administrador do sistema."
        corTexto={COR_TEXTO}
        corFundo={COR_FUNDO}
        aoSair={sair}
      />
    )
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: COR_FUNDO, color: COR_TEXTO }}>
      <header
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 px-6 py-3"
        style={{ borderColor: `${COR_TEXTO}22` }}
      >
        <h1 className="text-3xl font-black">Painel central</h1>
        <span className="text-2xl opacity-60">Todos os estabelecimentos</span>
        <button
          onClick={sair}
          className="ml-auto min-h-[52px] rounded-xl border-4 px-5 text-xl font-bold active:scale-95"
          style={{ borderColor: `${COR_TEXTO}44` }}
        >
          Sair
        </button>
      </header>

      {erro && (
        <p className="px-6 py-4 text-xl font-bold text-white" style={{ backgroundColor: ALERTA }} role="alert">
          {erro}
        </p>
      )}

      <div className="border-b-2 px-5 py-3" style={{ borderColor: `${COR_TEXTO}22` }}>
        <SeletorPeriodo
          dataInicio={dataInicio}
          dataFim={dataFim}
          aoMudarInicio={setDataInicio}
          aoMudarFim={setDataFim}
          corTexto={COR_TEXTO}
        />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: 'contain' }}>
        {carregandoLojas ? (
          <p className="mt-12 text-center text-3xl opacity-60">Carregando...</p>
        ) : lojas.length === 0 ? (
          <p className="mt-12 text-center text-3xl opacity-60">Nenhum estabelecimento cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lojas.map((loja) => (
              <li
                key={loja.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border-4 p-4"
                style={{ borderColor: `${COR_TEXTO}22` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold">{loja.nome}</p>
                  <p className="text-lg opacity-60">/{loja.slug}</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-black">{estatisticas[loja.id]?.total ?? 0}</p>
                  <p className="text-sm opacity-60">pedidos</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-black">{estatisticas[loja.id]?.pagos ?? 0}</p>
                  <p className="text-sm opacity-60">pagos</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-black" style={{ color: estatisticas[loja.id]?.desistencias ? ALERTA : undefined }}>
                    {estatisticas[loja.id]?.desistencias ?? 0}
                  </p>
                  <p className="text-sm opacity-60">desistências</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-black" style={{ color: estatisticas[loja.id]?.quedas ? ALERTA : undefined }}>
                    {estatisticas[loja.id]?.quedas ?? 0}
                  </p>
                  <p className="text-sm opacity-60">quedas</p>
                </div>

                <span
                  className="rounded-xl px-4 py-2 text-lg font-black text-white"
                  style={{ backgroundColor: loja.bloqueado ? ALERTA : '#16A34A' }}
                >
                  {loja.bloqueado ? 'Bloqueado' : 'Liberado'}
                </span>

                {!loja.ativo && (
                  <span className="rounded-xl border-4 px-4 py-2 text-lg font-bold opacity-70" style={{ borderColor: COR_TEXTO }}>
                    Desativado
                  </span>
                )}

                <button
                  onClick={() => alternarBloqueio(loja)}
                  className="min-h-[56px] rounded-xl px-6 text-xl font-black text-white active:scale-95"
                  style={{ backgroundColor: loja.bloqueado ? '#16A34A' : ALERTA }}
                >
                  {loja.bloqueado ? 'Desbloquear' : 'Bloquear'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
