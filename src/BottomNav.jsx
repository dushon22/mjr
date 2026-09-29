import { useLayoutEffect, useRef, useState } from 'react'
import { Home, Users, Package, Wallet, Calendar, ClipboardList } from 'lucide-react'

const TABS = [
  { key: 'inicio', label: 'Início', Icon: Home },
  { key: 'clientes', label: 'Clientes', Icon: Users },
  { key: 'estoque', label: 'Estoque', Icon: Package },
  { key: 'financeiro', label: 'Financeiro', Icon: Wallet },
  { key: 'agenda', label: 'Agenda', Icon: Calendar },
  { key: 'os', label: 'OS', Icon: ClipboardList },
]

function BottomNav({ activeTab, setActiveTab }) {
  const navRef = useRef(null)
  const itemRefs = useRef({})
  const [indicador, setIndicador] = useState({ left: 0, width: 0, pronto: false })

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    function atualizarIndicador() {
      const item = itemRefs.current[activeTab]
      if (!item) return
      const navRect = nav.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      setIndicador({ left: itemRect.left - navRect.left, width: itemRect.width, pronto: true })
    }

    atualizarIndicador()

    const observer = new ResizeObserver(atualizarIndicador)
    Object.values(itemRefs.current).forEach((el) => el && observer.observe(el))
    window.addEventListener('resize', atualizarIndicador)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', atualizarIndicador)
    }
  }, [activeTab])

  return (
    <nav className="bottom-nav" ref={navRef}>
      <span
        className="bottom-nav-indicador"
        aria-hidden="true"
        style={{
          transform: `translateX(${indicador.left}px)`,
          width: `${indicador.width}px`,
          opacity: indicador.pronto ? 1 : 0,
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
    </nav>
  )
}

export default BottomNav
