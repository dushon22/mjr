const TABS = [
  { key: 'inicio', label: 'Início' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'os', label: 'OS' },
]

function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        background: '#FFFFFF',
        borderTop: '1px solid #E2E0DC',
        boxSizing: 'border-box',
        minHeight: 76,
        paddingTop: 10,
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 24px)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#A6332C' : '#8A8A8A',
              fontWeight: isActive ? 'bold' : 'normal',
              fontSize: 12,
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
