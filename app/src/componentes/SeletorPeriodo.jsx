// ============================================================
// SELETOR DE PERIODO — dois campos de data (De / Ate), usado nas
// estatisticas do /admin e do /superadmin.
// ============================================================

export default function SeletorPeriodo({ dataInicio, dataFim, aoMudarInicio, aoMudarFim, corTexto }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 text-sm font-bold" style={{ color: corTexto }}>
        De
        <input
          type="date"
          value={dataInicio}
          max={dataFim}
          onChange={(e) => aoMudarInicio(e.target.value)}
          className="min-h-[44px] rounded-lg border-2 bg-transparent px-3 text-base"
          style={{ borderColor: `${corTexto}44`, color: corTexto }}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold" style={{ color: corTexto }}>
        Até
        <input
          type="date"
          value={dataFim}
          min={dataInicio}
          onChange={(e) => aoMudarFim(e.target.value)}
          className="min-h-[44px] rounded-lg border-2 bg-transparent px-3 text-base"
          style={{ borderColor: `${corTexto}44`, color: corTexto }}
        />
      </label>
    </div>
  )
}

// Converte "AAAA-MM-DD" (do <input type="date">) pro inicio/fim do
// dia em ISO — respeita o fuso do navegador de quem esta olhando
// (ferramenta interna, nao e o fuso do estabelecimento — REGRA 4 nao
// se aplica aqui, essa data nunca aparece pro cliente final).
export const inicioDoDiaIso = (data) => new Date(`${data}T00:00:00`).toISOString()
export const fimDoDiaIso = (data) => new Date(`${data}T23:59:59.999`).toISOString()

export function dataDeHoje() {
  return new Date().toLocaleDateString('en-CA') // AAAA-MM-DD
}

export function dataDiasAtras(dias) {
  return new Date(Date.now() - dias * 24 * 60 * 60_000).toLocaleDateString('en-CA')
}
