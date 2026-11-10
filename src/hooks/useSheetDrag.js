import { useEffect } from 'react'

// Arrastar para baixo para fechar um bottom sheet (porte do gesto do Meu Mês).
// - Pelo handle/cabeçalho (marcados com data-arrasto): pointer events com setPointerCapture.
// - Pelo conteúdo: touch events não passivos, só quando o corpo está com scrollTop 0 e o dedo desce.
// Só usa transform: translateY no sheet e a variável --bd (opacidade do fundo) no overlay.
const FECHAR_ACIMA = 0.25 // fração da altura do sheet
const VELOCIDADE_ALTA = 0.5 // px/ms
const IGNORAR = 'input,textarea,select,button,label,a'

export function useSheetDrag({ overlayRef, sheetRef, corpoRef, onFechar }) {
  useEffect(() => {
    const overlay = overlayRef.current
    const sheet = sheetRef.current
    const corpo = corpoRef.current
    if (!overlay || !sheet) return undefined

    const reduzir = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }
    let drag = null
    let timer = 0

    function iniciar(y) {
      clearTimeout(timer)
      sheet.style.transition = ''
      drag = { y0: y, dy: 0, pts: [{ y, t: Date.now() }] }
    }

    function mover(y) {
      if (!drag) return
      const agora = Date.now()
      drag.pts.push({ y, t: agora })
      while (drag.pts.length > 2 && agora - drag.pts[0].t > 100) drag.pts.shift()
      drag.dy = Math.max(0, y - drag.y0)
      sheet.style.transition = 'none'
      sheet.style.transform = `translateY(${drag.dy}px)`
      overlay.style.transition = 'none'
      overlay.style.setProperty('--bd', String(1 - Math.min(drag.dy / Math.max(sheet.offsetHeight, 1), 1)))
    }

    function terminar(cancelar) {
      if (!drag) return
      const d = drag
      drag = null
      const a = d.pts[0]
      const b = d.pts[d.pts.length - 1]
      const dt = b.t - a.t
      const v = dt > 0 ? (b.y - a.y) / dt : 0
      const fechar = !cancelar && d.dy > 0 && (d.dy > sheet.offsetHeight * FECHAR_ACIMA || v > VELOCIDADE_ALTA)
      if (fechar) {
        if (reduzir.matches) {
          onFechar()
          return
        }
        sheet.style.transition = 'transform 250ms ease-out'
        sheet.style.transform = 'translateY(100%)'
        overlay.style.transition = 'background 250ms ease-out'
        overlay.style.setProperty('--bd', '0')
        timer = setTimeout(onFechar, 250)
      } else {
        sheet.style.transition = reduzir.matches ? 'none' : 'transform 200ms ease-out'
        sheet.style.transform = 'translateY(0)'
        overlay.style.transition = reduzir.matches ? 'none' : 'background 200ms ease-out'
        overlay.style.setProperty('--bd', '1')
        timer = setTimeout(() => {
          sheet.style.transition = ''
          sheet.style.transform = ''
          overlay.style.transition = ''
        }, 210)
      }
    }

    // Handle e cabeçalho
    function aoPressionar(e) {
      if (e.button > 0 || !e.target.closest('[data-arrasto]') || e.target.closest(IGNORAR)) return
      iniciar(e.clientY)
      try {
        sheet.setPointerCapture(e.pointerId)
      } catch {
        // sem captura de ponteiro
      }
    }
    const aoMoverPonteiro = (e) => {
      if (drag && !drag.toque) mover(e.clientY)
    }
    const aoSoltar = () => {
      if (drag && !drag.toque) terminar(false)
    }
    const aoCancelar = () => {
      if (drag && !drag.toque) terminar(true)
    }

    // Conteúdo (só toque; não começa em campo ou botão; só com o corpo no topo)
    let cand = null
    function aoTocar(e) {
      cand = null
      if (drag || e.touches.length !== 1 || (corpo && corpo.scrollTop > 0)) return
      if (e.target.closest(IGNORAR) || e.target.closest('[data-arrasto]')) return
      cand = { y: e.touches[0].clientY, on: false }
    }
    function aoMoverToque(e) {
      if (!cand) return
      const y = e.touches[0].clientY
      if (!cand.on) {
        if (y - cand.y > 8 && (!corpo || corpo.scrollTop === 0)) {
          iniciar(cand.y)
          drag.toque = true
          cand.on = true
        } else if (y - cand.y < -8) {
          cand = null
        }
        if (!cand || !cand.on) return
      }
      if (e.cancelable) e.preventDefault()
      mover(y)
    }
    const aoFimToque = () => {
      if (cand && cand.on) terminar(false)
      cand = null
    }
    const aoCancelarToque = () => {
      if (cand && cand.on) terminar(true)
      cand = null
    }

    sheet.addEventListener('pointerdown', aoPressionar)
    sheet.addEventListener('pointermove', aoMoverPonteiro)
    sheet.addEventListener('pointerup', aoSoltar)
    sheet.addEventListener('pointercancel', aoCancelar)
    sheet.addEventListener('touchstart', aoTocar, { passive: true })
    sheet.addEventListener('touchmove', aoMoverToque, { passive: false })
    sheet.addEventListener('touchend', aoFimToque)
    sheet.addEventListener('touchcancel', aoCancelarToque)
    return () => {
      clearTimeout(timer)
      sheet.removeEventListener('pointerdown', aoPressionar)
      sheet.removeEventListener('pointermove', aoMoverPonteiro)
      sheet.removeEventListener('pointerup', aoSoltar)
      sheet.removeEventListener('pointercancel', aoCancelar)
      sheet.removeEventListener('touchstart', aoTocar)
      sheet.removeEventListener('touchmove', aoMoverToque)
      sheet.removeEventListener('touchend', aoFimToque)
      sheet.removeEventListener('touchcancel', aoCancelarToque)
    }
    // Os listeners são registrados uma vez; quem chama passa um onFechar estável (via ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
