// ============================================================
// FORMATACAO DE VALORES
//
// O banco devolve numeric como texto ('20.00'), entao tudo passa
// por Number() antes de formatar.
// ============================================================

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function emReais(valor) {
  return moeda.format(Number(valor) || 0)
}
