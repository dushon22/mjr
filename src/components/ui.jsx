import { ChevronRight } from 'lucide-react'
import StatusTag from './StatusTag'

// Componentes visuais compartilhados por Início, Financeiro e Clientes.

export const MARGEM_TELA = 16

// Cabeçalho escuro com título centralizado. `titulo` pode ser texto ou um nó (ex.: logo + nome).
export function CabecalhoTela({ titulo, children }) {
  return (
    <header
      style={{
        background: 'var(--mjr-bg)',
        padding: `24px ${MARGEM_TELA}px`,
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
      }}
    >
      <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 500 }}>{titulo}</h1>
      {children}
    </header>
  )
}

// Título de seção, com link opcional à direita.
export function TituloSecao({ children, onVer, rotuloVer = 'Ver financeiro' }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '20px 0 10px',
        textAlign: 'left',
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#f2f3f5' }}>{children}</h3>
      {onVer && (
        <button
          type="button"
          onClick={onVer}
          style={{ color: '#7db2ff', fontSize: 13, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {rotuloVer}
        </button>
      )}
    </div>
  )
}

// Container de tela: margem lateral padrão.
export function CorpoTela({ children, style }) {
  return <div style={{ padding: `0 ${MARGEM_TELA}px`, ...style }}>{children}</div>
}

// Empilha cartões com 10px entre eles.
export function ListaCartoes({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
}

export const estiloCartao = {
  background: '#FFFFFF',
  border: '1px solid #E4E7EC',
  borderRadius: 16,
  padding: 14,
  textAlign: 'left',
  boxSizing: 'border-box',
}

// Área tocável (role="button", foco por teclado, feedback de pressão) com chevron discreto.
export function AreaToque({ onClick, style, children, chevron = true, corChevron = '#9aa0ad', label }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cartao-toque"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={{ position: 'relative', cursor: 'pointer', ...style }}
    >
      {children}
      {chevron && (
        <ChevronRight
          size={16}
          color={corChevron}
          aria-hidden="true"
          style={{ position: 'absolute', right: 8, bottom: 8, opacity: 0.7 }}
        />
      )}
    </div>
  )
}

// Linha de lista: faixa lateral colorida, nome, linhas de apoio, valor e etiqueta de status.
// `etiqueta`: { tom, texto }. `direita`: nó (ex.: valor) mostrado acima da etiqueta.
export function LinhaLista({ nome, apoio = [], direita, etiqueta, cor, onClick }) {
  const conteudo = (
    <>
      <div style={{ width: 4, background: cor, flexShrink: 0 }} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: 14,
        }}
      >
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#14202e', textAlign: 'left' }}>{nome}</div>
          {apoio.filter(Boolean).map((linha, i) => (
            <div
              key={i}
              style={{ fontSize: 13, color: '#6b7280', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {linha}
            </div>
          ))}
        </div>
        {(direita || etiqueta) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            {direita}
            {etiqueta && <StatusTag tom={etiqueta.tom}>{etiqueta.texto}</StatusTag>}
          </div>
        )}
      </div>
    </>
  )
  const estilo = {
    display: 'flex',
    alignItems: 'stretch',
    background: '#FFFFFF',
    border: '1px solid #E4E7EC',
    borderRadius: 16,
    overflow: 'hidden',
  }
  if (!onClick) return <div style={estilo}>{conteudo}</div>
  return (
    <div
      role="button"
      tabIndex={0}
      className="cartao-toque"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={{ ...estilo, cursor: 'pointer' }}
    >
      {conteudo}
    </div>
  )
}

// Linha de filtros (pílulas). `opcoes`: lista de textos; `ativo`: texto selecionado.
export function Filtros({ opcoes, ativo, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: `16px ${MARGEM_TELA}px`, overflowX: 'auto' }}>
      {opcoes.map((opcao) => {
        const selecionado = opcao === ativo
        return (
          <button
            key={opcao}
            type="button"
            onClick={() => onChange?.(opcao)}
            style={{
              flexShrink: 0,
              height: 36,
              padding: '0 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: selecionado ? 600 : 400,
              background: selecionado ? 'var(--mjr-navy)' : '#FFFFFF',
              color: selecionado ? '#FFFFFF' : 'var(--mjr-navy)',
              border: selecionado ? '1px solid #2a4f7f' : '1px solid #E2E0DC',
              cursor: 'pointer',
            }}
          >
            {opcao}
          </button>
        )
      })}
    </div>
  )
}
