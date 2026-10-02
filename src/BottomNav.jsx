import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Home, Users, Package, Wallet, Calendar, ClipboardList } from 'lucide-react'

const TABS = [
  { key: 'inicio', label: 'Início', Icon: Home },
  { key: 'clientes', label: 'Clientes', Icon: Users },
  { key: 'estoque', label: 'Estoque', Icon: Package },
  { key: 'financeiro', label: 'Financeiro', Icon: Wallet },
  { key: 'agenda', label: 'Agenda', Icon: Calendar },
  { key: 'os', label: 'OS', Icon: ClipboardList },
]

const ICONE_LARGURA = 24
const GAP_LABEL = 6
const PADDING_H = 20 // padding: 8px 10px (mobile) somado dos dois lados

// Largura do maior rótulo (medida via canvas, sem tocar no DOM real) + ícone/paddings,
// usada como largura FIXA do indicador — assim ele só precisa animar transform, não width.
function calcularLarguraIndicador() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = "500 12px 'InterVariable', 'Inter', system-ui, sans-serif"
  const maiorLabel = Math.max(...TABS.map(({ label }) => ctx.measureText(label).width))
  return Math.ceil(ICONE_LARGURA + GAP_LABEL + maiorLabel + PADDING_H)
}

function BottomNav({ activeTab, setActiveTab }) {
  const navRef = useRef(null)
  const itemRefs = useRef({})
  const [larguraIndicador] = useState(calcularLarguraIndicador)
  const [indicadorLeft, setIndicadorLeft] = useState(0)
  const [pronto, setPronto] = useState(false)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    function atualizarIndicador() {
      const item = itemRefs.current[activeTab]
      if (!item) return
      const navRect = nav.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      const centro = itemRect.left - navRect.left + itemRect.width / 2
      setIndicadorLeft(centro - larguraIndicador / 2)
      setPronto(true)
    }

    atualizarIndicador()

    const observer = new ResizeObserver(atualizarIndicador)
    Object.values(itemRefs.current).forEach((el) => el && observer.observe(el))
    window.addEventListener('resize', atualizarIndicador)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', atualizarIndicador)
    }
  }, [activeTab, larguraIndicador])

  // Renderizada direto em document.body, fora dos wrappers das telas, para o
  // position: fixed ficar sempre relativo à viewport.
  return createPortal(
    <nav className="bottom-nav" ref={navRef}>
      <span
        className="bottom-nav-indicador"
        aria-hidden="true"
        style={{
          width: `${larguraIndicador}px`,
          transform: `translateX(${indicadorLeft}px)`,
          opacity: pronto ? 1 : 0,
        }}
      />
      {TABS.map(({ key, label, Icon }) => {
        const isActive = activeTab === key
        return (
          <button
            key={key}
            ref={(el) => { itemRefs.current[key] = el }}
            type="button"
            onClick={() => setActiveTab(key)}
            aria-label={label}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.4 : 2} />
            <span className="bottom-nav-label">{label}</span>
          </button>
        )
      })}
    </nav>,
    document.body,
  )
}

export default BottomNav
