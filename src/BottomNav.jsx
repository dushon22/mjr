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
  return (
    <nav className="bottom-nav">
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
    </nav>
  )
}

export default BottomNav
