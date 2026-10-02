// DEBUG TEMPORÁRIO: mostra medidas da viewport no topo da tela por 10s após a abertura.
// Para remover: apague este arquivo e o import em main.jsx.

const painel = document.createElement('div')
painel.style.cssText = [
  'position: fixed',
  'top: env(safe-area-inset-top)',
  'left: 0',
  'right: 0',
  'z-index: 2147483647',
  'background: #ffeb3b',
  'color: #000',
  'font: 12px/1.4 ui-monospace, Consolas, monospace',
  'padding: 4px 6px',
  'text-align: left',
  'white-space: pre-wrap',
  'pointer-events: none',
].join(';')

// Sonda: o padding-bottom calculado é o valor real de env(safe-area-inset-bottom).
const sonda = document.createElement('div')
sonda.style.cssText = 'position: fixed; left: 0; top: 0; width: 0; height: 0; visibility: hidden; padding-bottom: env(safe-area-inset-bottom)'

function atualizar() {
  const safeBottom = getComputedStyle(sonda).paddingBottom
  painel.textContent = [
    `innerHeight: ${window.innerHeight}`,
    `outerHeight: ${window.outerHeight}`,
    `screen.height: ${screen.height}`,
    `clientHeight: ${document.documentElement.clientHeight}`,
    `visualViewport.height: ${window.visualViewport ? window.visualViewport.height : 'n/a'}`,
    `standalone: ${window.matchMedia('(display-mode: standalone)').matches}`,
    `safe-area-inset-bottom: ${safeBottom}`,
  ].join(' | ')
}

document.body.appendChild(sonda)
document.body.appendChild(painel)
atualizar()

const inicio = Date.now()
const timer = setInterval(() => {
  atualizar()
  if (Date.now() - inicio >= 10000) clearInterval(timer)
}, 500)
