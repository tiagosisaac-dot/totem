// ============================================================
// TEXTO DO CUPOM — comandos ESC/POS crus para a impressora
//
// A Bematech i9 aceita ESC/POS (confirmado: é o mesmo protocolo dos
// modelos Elgin i8/i9 e da própria linha MP-4200 TH da Bematech).
//
// Isto é um PONTO DE PARTIDA, não testado na impressora física — só
// dá pra ajustar tamanho/corte vendo o papel sair de verdade. Ver
// `docs/ESTADO.md` sobre o teste pendente.
// ============================================================

const ESC = '\x1B'
const GS = '\x1D'

const INICIAR = ESC + '@'
const CENTRALIZAR = ESC + 'a' + '\x01'
const ALINHAR_ESQUERDA = ESC + 'a' + '\x00'
const NEGRITO_LIGA = ESC + 'E' + '\x01'
const NEGRITO_DESLIGA = ESC + 'E' + '\x00'
const FONTE_GRANDE = GS + '!' + '\x11' // dobro de altura e largura
const FONTE_NORMAL = GS + '!' + '\x00'
const CORTAR_PAPEL = GS + 'V' + '\x00'

const LINHA = '--------------------------------\n'

function linhasDoItem(item) {
  const linhas = [`${item.quantidade}x ${item.nome_snap}\n`]
  for (const opcao of item.pedido_item_opcoes ?? []) {
    linhas.push(`   + ${opcao.nome_snap}\n`)
  }
  return linhas.join('')
}

// Monta o texto completo do cupom para um pedido (com pedido_itens e
// pedido_item_opcoes já carregados).
export function montarCupom(pedido) {
  const principais = pedido.pedido_itens.filter((i) => !i.combo_pai_id)
  const filhosDe = (id) => pedido.pedido_itens.filter((i) => i.combo_pai_id === id)

  const partes = []
  partes.push(INICIAR)
  partes.push(CENTRALIZAR)
  partes.push(NEGRITO_LIGA, FONTE_GRANDE, 'PEDIDO TOTEM\n', FONTE_NORMAL, NEGRITO_DESLIGA)
  partes.push(NEGRITO_LIGA)
  partes.push(pedido.tipo_consumo === 'levar' ? '*** PARA LEVAR ***\n' : '*** COMER AQUI ***\n')
  partes.push(NEGRITO_DESLIGA)
  partes.push(FONTE_GRANDE, `${pedido.nome_cliente}\n`, FONTE_NORMAL)
  partes.push(ALINHAR_ESQUERDA)
  partes.push(LINHA)

  for (const item of principais) {
    partes.push(linhasDoItem(item))
    for (const filho of filhosDe(item.id)) {
      partes.push(`   -> ${filho.nome_snap}\n`)
    }
  }

  partes.push(LINHA)
  partes.push(NEGRITO_LIGA, `Total: ${emReaisSimples(pedido.total)}\n`, NEGRITO_DESLIGA)

  const horario = new Date(pedido.criado_em).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  // pedido #N e so referencia interna — nao e o destaque do cupom
  partes.push(`Pedido #${pedido.senha}  ${horario}\n`)

  partes.push('\n\n\n')
  partes.push(CORTAR_PAPEL)

  return partes.join('')
}

// Formatação simples, sem depender do Intl (o texto vai direto pra
// impressora, não pra tela) — evita símbolo de moeda que a i9 talvez
// não tenha na tabela de caracteres padrão.
function emReaisSimples(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`
}
