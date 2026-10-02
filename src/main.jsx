import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App.jsx'

// Altura real da janela em --app-h: no iOS PWA a viewport inicial pode vir menor
// e só se corrige depois; recalculamos nos eventos que podem mudá-la.
function setAppHeight() {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`)
}

setAppHeight()
window.addEventListener('load', setAppHeight)
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', setAppHeight)
window.addEventListener('pageshow', setAppHeight)
document.addEventListener('visibilitychange', setAppHeight)
window.visualViewport?.addEventListener('resize', setAppHeight)
setTimeout(setAppHeight, 100)
setTimeout(setAppHeight, 500)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
