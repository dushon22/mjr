const TONS = {
  verde: { background: '#1A7F46', color: '#FFFFFF' },
  azul: { background: '#1D4E89', color: '#FFFFFF' },
  ambar: { background: '#F2B84B', color: '#3a2600' },
  vermelho: { background: '#C62E22', color: '#FFFFFF' },
}

function StatusTag({ tom, children }) {
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 500,
        padding: '4px 12px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        ...TONS[tom],
      }}
    >
      {children}
    </span>
  )
}

export default StatusTag
