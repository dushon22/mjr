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

function BottomNav({ activeTab, setActiveTab }) {
  const indiceAtivo = Math.max(0, TABS.findIndex(({ key }) => key === activeTab))

  // Renderizada direto em document.body, fora dos wrappers das telas, para o
  // position: fixed ficar sempre relativo à viewport.
  return createPortal(
    <nav className="bottom-nav">
      <span
        className="bottom-nav-indicador"
        aria-hidden="true"
        style={{ transform: `translateX(${indiceAtivo * 100}%)` }}
      />
      {TABS.map(({ key, label, Icon }) => {
        const isActive = activeTab === key
        return (
          <button
            key={key}
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
