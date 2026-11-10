import { useEffect } from 'react'

// Trava a rolagem e a interação com o fundo enquanto algum modal/sheet está aberto.
// Suporta vários modais ao mesmo tempo (contador): só trava no primeiro e só libera no último.
let contador = 0
let scrollSalvo = 0

// Camadas atrás do modal: conteúdo do app, barra inferior e botão "+".
const SELETORES_FUNDO = ['#root', '.bottom-nav', '.fab']

function elementosDeFundo() {
  return SELETORES_FUNDO.flatMap((seletor) => Array.from(document.querySelectorAll(seletor)))
}

function travar() {
  contador += 1
  if (contador > 1) return
  scrollSalvo = window.scrollY
  Object.assign(document.body.style, {
    position: 'fixed',
    top: `-${scrollSalvo}px`,
    left: '0',
    right: '0',
    width: '100%',
  })
  document.documentElement.setAttribute('data-modal-aberto', '')
  elementosDeFundo().forEach((el) => {
    el.setAttribute('aria-hidden', 'true')
    el.setAttribute('inert', '')
  })
}

function destravar() {
  contador = Math.max(0, contador - 1)
  if (contador > 0) return
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' })
  document.documentElement.removeAttribute('data-modal-aberto')
  elementosDeFundo().forEach((el) => {
    el.removeAttribute('aria-hidden')
    el.removeAttribute('inert')
  })
  window.scrollTo(0, scrollSalvo)
}

export function useScrollLock(ativo = true) {
  useEffect(() => {
    if (!ativo) return undefined
    travar()
    return destravar
  }, [ativo])
}
