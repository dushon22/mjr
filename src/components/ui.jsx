import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, X } from 'lucide-react'
import StatusTag from './StatusTag'
import { useScrollLock } from '../hooks/useScrollLock'

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

export const estiloCampo = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  borderRadius: 10,
  border: '1px solid #E4E7EC',
  fontSize: 16,
  background: '#FFFFFF',
}

export const estiloRotulo = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4A4A4A', textAlign: 'left' }

// Seletor segmentado. `opcoes`: [{ valor, rotulo, cor? }].
export function SeletorSegmentado({ opcoes, valor, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, background: '#F1F2F4', padding: 4, borderRadius: 12 }}>
      {opcoes.map((o) => {
        const ativo = valor === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => onChange(o.valor)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 9,
              border: 'none',
              fontSize: 14,
              fontWeight: ativo ? 700 : 500,
              background: ativo ? '#FFFFFF' : 'transparent',
              color: ativo ? o.cor ?? 'var(--mjr-navy)' : '#6b7280',
              boxShadow: ativo ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              cursor: 'pointer',
            }}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

// Bottom sheet: handle, título, X, fecha ao tocar fora. Corpo rolável e `rodape` fixo.
// Acompanha o visualViewport para o teclado do iOS não esconder o campo focado.
export function BottomSheet({ titulo, onFechar, onSubmit, rodape, children }) {
  useScrollLock()
  const [viewport, setViewport] = useState(() => lerViewport())

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const atualizar = () => setViewport(lerViewport())
    vv.addEventListener('resize', atualizar)
    vv.addEventListener('scroll', atualizar)
    return () => {
      vv.removeEventListener('resize', atualizar)
      vv.removeEventListener('scroll', atualizar)
    }
  }, [])

  // Ao focar um campo, rola o corpo do sheet até ele (depois de o teclado abrir).
  function aoFocar(e) {
    const alvo = e.target
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return
    setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
  }

  return createPortal(
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: viewport.top,
        height: viewport.height,
        zIndex: 200,
        touchAction: 'none',
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'mjr-fade 180ms ease-out',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        onFocus={aoFocar}
        style={{
          width: '100%',
          maxWidth: 520,
          boxSizing: 'border-box',
          maxHeight: Math.min(viewport.height, window.innerHeight * 0.9),
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          animation: 'mjr-sheet 240ms cubic-bezier(0.3, 0.7, 0.2, 1)',
        }}
      >
        <div style={{ padding: '8px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D0D5DD', margin: '0 auto 8px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#14202e' }}>{titulo}</h2>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6b7280', display: 'flex' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {children}
        </div>
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            gap: 10,
            padding: '12px 20px calc(env(safe-area-inset-bottom) + 16px)',
            borderTop: '1px solid #E4E7EC',
            background: '#FFFFFF',
          }}
        >
          {rodape}
        </div>
      </form>
    </div>,
    document.body,
  )
}

function lerViewport() {
  const vv = window.visualViewport
  return vv ? { top: vv.offsetTop, height: vv.height } : { top: 0, height: window.innerHeight }
}

// Botões padrão do rodapé do sheet.
export function RodapeSheet({ salvando, onExcluir }) {
  return (
    <>
      {onExcluir && (
        <button
          type="button"
          onClick={onExcluir}
          disabled={salvando}
          style={{ flex: 1, padding: 14, borderRadius: 10, border: '1px solid #a32d2d', background: '#FFFFFF', color: '#a32d2d', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}
        >
          Excluir
        </button>
      )}
      <button
        type="submit"
        disabled={salvando}
        style={{ flex: 2, padding: 14, borderRadius: 10, border: 'none', background: 'var(--mjr-navy)', color: '#FFFFFF', fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.6 : 1 }}
      >
        {salvando ? 'Salvando...' : 'Salvar'}
      </button>
    </>
  )
}
