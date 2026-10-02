import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App.jsx'

// No iOS PWA o innerHeight vem menor que a tela na abertura (só corrige ao rolar).
// Em standalone usamos a altura física da tela; fora dele, innerHeight.
// A classe "standalone" no <html> ativa o posicionamento da barra e do "+" por top (index.css).
function setAppHeight() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  let h = window.innerHeight
  if (standalone) {
    const retrato = window.matchMedia('(orientation: portrait)').matches
    h = retrato ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
  }
  document.documentElement.classList.toggle('standalone', standalone)
  document.documentElement.style.setProperty('--app-h', `${h}px`)
}

setAppHeight()
window.addEventListener('load', setAppHeight)
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', setAppHeight)
window.addEventListener('pageshow', setAppHeight)
document.addEventListener('visibilitychange', setAppHeight)
setTimeout(setAppHeight, 100)
setTimeout(setAppHeight, 500)
setTimeout(setAppHeight, 1500)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
