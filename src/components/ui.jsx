import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, X } from 'lucide-react'
import StatusTag from './StatusTag'
import { useSheetDrag } from '../hooks/useSheetDrag'

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

// Bottom sheet (mesma abordagem do Meu Mês): backdrop fixo cobrindo a tela, painel com
// max-height 90dvh, corpo rolável e rodapé fixo. Enquanto aberto, `modal-aberto` no body
// trava o .wrap (que é quem rola) e esconde a barra inferior e o "+".
export function BottomSheet({ titulo, onFechar, onSubmit, rodape, children }) {
  const corpoRef = useRef(null)
  const overlayRef = useRef(null)
  const sheetRef = useRef(null)
  // O hook registra os listeners uma vez; esta ref mantém o onFechar mais recente.
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useSheetDrag({ overlayRef, sheetRef, corpoRef, onFechar: () => fecharRef.current() })

  useEffect(() => {
    document.body.classList.add('modal-aberto')
    return () => document.body.classList.remove('modal-aberto')
  }, [])

  // Só deixa o corpo rolar se o conteúdo não couber (evita "elástico" com o teclado do iOS).
  useEffect(() => {
    const corpo = corpoRef.current
    if (!corpo) return undefined
    function ajustar() {
      corpo.style.overflowY = 'auto'
      const ultimo = corpo.lastElementChild
      const precisa = ultimo ? ultimo.getBoundingClientRect().bottom - corpo.getBoundingClientRect().top + corpo.scrollTop : 0
      if (Math.max(precisa, 0) <= corpo.clientHeight + 1) {
        corpo.style.overflowY = 'hidden'
        corpo.scrollTop = 0
      }
    }
    let timer
    const aoFocar = () => { timer = setTimeout(ajustar, 300) }
    ajustar()
    window.addEventListener('resize', ajustar)
    window.visualViewport?.addEventListener('resize', ajustar)
    corpo.addEventListener('focusin', aoFocar)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', ajustar)
      window.visualViewport?.removeEventListener('resize', ajustar)
      corpo.removeEventListener('focusin', aoFocar)
    }
  })

  return createPortal(
    <div
      ref={overlayRef}
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        overscrollBehavior: 'contain',
        background: 'rgba(0, 0, 0, calc(0.55 * var(--bd, 1)))',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'mjr-fade 180ms ease-out',
      }}
    >
      <form
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          boxSizing: 'border-box',
          maxHeight: '90dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          animation: 'mjr-sheet 240ms cubic-bezier(0.3, 0.7, 0.2, 1)',
        }}
      >
        <div data-arrasto style={{ padding: '8px 20px 0', flexShrink: 0, touchAction: 'none', cursor: 'grab' }}>
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
          ref={corpoRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
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
