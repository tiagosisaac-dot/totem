// ============================================================
// IDENTIDADE DO ESTABELECIMENTO PERANTE O QZ TRAY
//
// Sem certificado, toda conexao aparece pro QZ Tray como "anonima" — e
// pedido anonimo NUNCA pode ser lembrado, pede autorizacao manual a
// cada impressao (inviavel com balcao cheio). Com certificado, a
// conexao passa a ter identidade fixa e o "lembrar" do QZ Tray
// funciona de verdade.
//
// Certificado e chave vem do banco (estabelecimentos.config —
// REGRA 1), um par por estabelecimento, gerado no cadastro do
// cliente. Nunca ficam versionados no codigo.
// ============================================================

import { KEYUTIL, KJUR, stob64, hextorstr } from 'jsrsasign'

// Chama uma vez, antes de qz.websocket.connect().
export function configurarAssinaturaQz(qz, certificado, chavePrivada) {
  qz.security.setCertificatePromise((resolve) => resolve(certificado))

  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise((paraAssinar) => (resolve, reject) => {
    try {
      const chave = KEYUTIL.getKey(chavePrivada)
      const assinatura = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' })
      assinatura.init(chave)
      assinatura.updateString(paraAssinar)
      resolve(stob64(hextorstr(assinatura.sign())))
    } catch (erro) {
      console.error('Falha ao assinar requisição do QZ Tray:', erro)
      reject(erro)
    }
  })
}
