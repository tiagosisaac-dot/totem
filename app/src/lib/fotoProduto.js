// ============================================================
// FOTO DE PRODUTO — redimensiona no navegador e sobe pro Storage
//
// REGRA 5: max 800px no maior lado, WebP leve. Antes disso so existia
// upload manual (arrastar no painel do Supabase) + redimensionamento
// feito por fora, na mao. Essa e a primeira vez que o proprio app faz
// isso.
//
// upsert:true e o ponto central: sem isso o Storage do Supabase cria
// um arquivo "nome (1).webp" em vez de substituir — foi exatamente o
// bug que apareceu trocando as fotos das bebidas a mao pelo painel.
// ============================================================

import { supabase } from './supabase.js'

const LADO_MAXIMO = 800
const QUALIDADE_INICIAL = 0.75
const QUALIDADE_SE_GRANDE = 0.6
const TAMANHO_MAXIMO_BYTES = 150 * 1024

async function carregarImagem(arquivo) {
  const url = URL.createObjectURL(arquivo)
  try {
    const imagem = new Image()
    const carregou = new Promise((resolve, reject) => {
      imagem.onload = resolve
      imagem.onerror = () => reject(new Error('Não foi possível abrir essa imagem.'))
    })
    imagem.src = url
    await carregou
    return imagem
  } finally {
    URL.revokeObjectURL(url)
  }
}

function desenharRedimensionado(imagem) {
  const maiorLado = Math.max(imagem.width, imagem.height)
  const escala = maiorLado > LADO_MAXIMO ? LADO_MAXIMO / maiorLado : 1

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagem.width * escala)
  canvas.height = Math.round(imagem.height * escala)

  const ctx = canvas.getContext('2d')
  ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height)
  return canvas
}

function paraBlob(canvas, qualidade) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao converter a imagem.'))),
      'image/webp',
      qualidade,
    )
  })
}

// Redimensiona pro maior lado <= 800px e converte pra WebP. Tenta de
// novo com qualidade menor se ainda ficar pesado — sem loop, só essa
// segunda tentativa.
export async function redimensionarParaWebp(arquivo) {
  const imagem = await carregarImagem(arquivo)
  const canvas = desenharRedimensionado(imagem)

  let blob = await paraBlob(canvas, QUALIDADE_INICIAL)
  if (blob.size > TAMANHO_MAXIMO_BYTES) {
    blob = await paraBlob(canvas, QUALIDADE_SE_GRANDE)
  }
  return blob
}

// Sobe a foto de um produto e devolve a URL pública já com marca de
// versão (?v=timestamp) — assim, toda vez que a foto trocar, o
// endereço muda junto e o navegador nunca fica preso servindo a foto
// antiga do cache (pegadinha que já aconteceu com as fotos das
// bebidas: o Storage guarda a mesma URL por 1h no Cache-Control).
export async function enviarFotoProduto({ estabelecimentoId, produtoId, arquivo }) {
  const blob = await redimensionarParaWebp(arquivo)
  const caminho = `${estabelecimentoId}/produtos/${produtoId}.webp`

  const { error } = await supabase.storage
    .from('cardapio')
    .upload(caminho, blob, { upsert: true, contentType: 'image/webp' })

  if (error) throw error

  const { data } = supabase.storage.from('cardapio').getPublicUrl(caminho)
  return `${data.publicUrl}?v=${Date.now()}`
}
