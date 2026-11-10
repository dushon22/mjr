import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import StatusTag from '../components/StatusTag'
import BotaoFlutuante from '../components/BotaoFlutuante'

const filtros = ['Todos', 'Recebidos', 'A receber', 'Gastos']

// Tipos de lançamento no modal. Mapeiam para o modelo atual da tabela financeiro:
// recebido = a_receber/pago, a_receber = a_receber/aberto, gasto = a_pagar/pago.
const TIPOS_LANCAMENTO = [
  { valor: 'recebido', rotulo: 'Recebido' },
  { valor: 'a_receber', rotulo: 'A receber' },
  { valor: 'gasto', rotulo: 'Gasto' },
]

const VERDE = '#6FAE72'
const VERMELHO = '#C97A73'

function formatarValor(valor) {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatarSaldo(valor) {
  return `${valor < 0 ? '-' : ''}${formatarValor(Math.abs(valor))}`
}

function formatarData(data) {
  if (!data) return ''
  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

function paraISO(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function rotuloPeriodo(tipo, data) {
  if (tipo === 'ano') return String(data.getFullYear())
  if (tipo === 'dia') {
    const texto = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(' de ', ' ')
}

function calcularIntervaloPeriodo(tipo, data) {
  const ano = data.getFullYear()
  const mes = data.getMonth()
  const dia = data.getDate()
  if (tipo === 'dia') {
    const iso = paraISO(new Date(ano, mes, dia))
    return { inicio: iso, fim: iso }
  }
  if (tipo === 'ano') {
    return { inicio: paraISO(new Date(ano, 0, 1)), fim: paraISO(new Date(ano, 11, 31)) }
  }
  return { inicio: paraISO(new Date(ano, mes, 1)), fim: paraISO(new Date(ano, mes + 1, 0)) }
}

function dataRelevanteISO(conta) {
  const campo = conta.status === 'pago' ? conta.pago_em : conta.vencimento
  return campo ? campo.slice(0, 10) : null
}

function dentroDoPeriodo(conta, intervalo) {
  const dataISO = dataRelevanteISO(conta)
  if (!dataISO) return false
  return dataISO >= intervalo.inicio && dataISO <= intervalo.fim
}

function estaVencida(conta, hojeISO) {
  return conta.status === 'aberto' && conta.vencimento && conta.vencimento.slice(0, 10) < hojeISO
}

const ehRecebido = (c) => c.tipo === 'a_receber' && c.status === 'pago'
const ehAReceber = (c) => c.tipo === 'a_receber' && c.status === 'aberto'
const ehGasto = (c) => c.tipo === 'a_pagar' && c.status === 'pago'

function tipoLancamentoDe(conta) {
  if (conta.tipo === 'a_receber') return conta.status === 'pago' ? 'recebido' : 'a_receber'
  return 'gasto'
}

function estiloLinha(conta, hojeISO) {
  if (ehRecebido(conta)) {
    return { tag: 'Recebido', tom: 'verde', cor: '#4C7A4E', texto: `Recebido em ${formatarData(conta.pago_em)}`, sinal: '+', corValor: '#1A7F46' }
  }
  if (conta.tipo === 'a_pagar') {
    const paga = conta.status === 'pago'
    return {
      tag: paga ? 'Gasto' : 'A pagar',
      tom: paga ? 'vermelho' : 'ambar',
      cor: 'var(--mjr-red)',
      texto: paga ? `Pago em ${formatarData(conta.pago_em)}` : `Vence em ${formatarData(conta.vencimento)}`,
      sinal: '-',
      corValor: '#C62E22',
    }
  }
  if (estaVencida(conta, hojeISO)) {
    return { tag: 'Vencida', tom: 'vermelho', cor: 'var(--mjr-red)', texto: `Venceu em ${formatarData(conta.vencimento)}`, sinal: '', corValor: 'var(--mjr-navy)' }
  }
  return { tag: 'A receber', tom: 'ambar', cor: '#6b7280', texto: `Vence em ${formatarData(conta.vencimento)}`, sinal: '', corValor: 'var(--mjr-navy)' }
}

function Financeiro({ dataVersion, ativa }) {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [tipoLancamento, setTipoLancamento] = useState('recebido')
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [contaEditando, setContaEditando] = useState(null)

  const [periodoTipo, setPeriodoTipo] = useState('mes')
  const [dataReferencia, setDataReferencia] = useState(() => new Date())
  const [filtroAtivo, setFiltroAtivo] = useState('Todos')

  function mudarPeriodo(delta) {
    const nova = new Date(dataReferencia)
    if (periodoTipo === 'dia') nova.setDate(nova.getDate() + delta)
    else if (periodoTipo === 'ano') nova.setFullYear(nova.getFullYear() + delta)
    else nova.setMonth(nova.getMonth() + delta)
    setDataReferencia(nova)
  }

  function abrirNovo() {
    setContaEditando(null)
    setDescricao('')
    setTipoLancamento('recebido')
    setValor('')
    setData(paraISO(new Date()))
    setMostrarForm(true)
  }

  function abrirEdicao(conta) {
    setContaEditando(conta)
    setDescricao(conta.descricao ?? '')
    setTipoLancamento(tipoLancamentoDe(conta))
    setValor(String(conta.valor ?? ''))
    setData(dataRelevanteISO(conta) ?? paraISO(new Date()))
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setContaEditando(null)
  }

  async function carregarContas() {
    const { data, error } = await supabase
      .from('financeiro')
      .select('*, clientes(nome)')
      .order('vencimento', { ascending: true })
    if (error) {
      console.error('Erro ao buscar contas:', error)
    } else {
      setContas(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (ativa) carregarContas()
  }, [dataVersion, ativa])

  async function salvar(e) {
    e.preventDefault()
    if (!Number(valor)) return
    if (contaEditando && !window.confirm('Salvar alterações deste lançamento?')) return
    setSalvando(true)
    // Meio-dia em UTC-3: funciona se pago_em for date ou timestamptz sem virar o dia.
    const pagoEm = `${data}T12:00:00-03:00`
    const dados = {
      descricao,
      valor: Number(valor),
      vencimento: data,
      tipo: tipoLancamento === 'gasto' ? 'a_pagar' : 'a_receber',
      status: tipoLancamento === 'a_receber' ? 'aberto' : 'pago',
      pago_em: tipoLancamento === 'a_receber' ? null : pagoEm,
    }
    const { error } = contaEditando
      ? await supabase.from('financeiro').update(dados).eq('id', contaEditando.id)
      : await supabase.from('financeiro').insert(dados)
    setSalvando(false)
    if (error) {
      console.error('Erro ao salvar lançamento:', error)
      alert('Não foi possível salvar o lançamento. Tente novamente.')
      return
    }
    fecharForm()
    await carregarContas()
  }

  async function excluir() {
    if (!window.confirm(`Excluir o lançamento "${contaEditando.descricao}"?`)) return
    setSalvando(true)
    const { error } = await supabase.from('financeiro').delete().eq('id', contaEditando.id)
    setSalvando(false)
    if (error) {
      console.error('Erro ao excluir conta:', error)
      alert('Não foi possível excluir o lançamento. Tente novamente.')
      return
    }
    fecharForm()
    await carregarContas()
  }

  const hojeISO = paraISO(new Date())
  const intervalo = calcularIntervaloPeriodo(periodoTipo, dataReferencia)

  const somar = (lista) => lista.reduce((s, c) => s + Number(c.valor), 0)
  const noPeriodo = contas.filter((c) => dentroDoPeriodo(c, intervalo))
  const totalRecebido = somar(noPeriodo.filter(ehRecebido))
  const totalAReceber = somar(noPeriodo.filter(ehAReceber))
  const totalGastos = somar(noPeriodo.filter(ehGasto))
  const saldoCaixa = totalRecebido - totalGastos

  const contasFiltradas = noPeriodo.filter((c) => {
    if (filtroAtivo === 'Recebidos') return ehRecebido(c)
    if (filtroAtivo === 'A receber') return ehAReceber(c)
    if (filtroAtivo === 'Gastos') return c.tipo === 'a_pagar'
    return true
  })

  const secoes = [
    { titulo: 'Em aberto', contas: contasFiltradas.filter((c) => c.status === 'aberto') },
    {
      titulo: 'Pagos / recebidos',
      // Mais recente primeiro: data de pagamento desc; empate pelo último lançado (created_at desc).
      contas: contasFiltradas
        .filter((c) => c.status === 'pago')
        .sort((a, b) => {
          const porData = (b.pago_em?.slice(0, 10) ?? '').localeCompare(a.pago_em?.slice(0, 10) ?? '')
          if (porData !== 0) return porData
          return (b.created_at ?? '').localeCompare(a.created_at ?? '')
        }),
    },
  ]

  const cardsTopo = [
    { rotulo: 'Recebido', valor: totalRecebido, cor: VERDE },
    { rotulo: 'A receber', valor: totalAReceber, cor: '#E0B15A' },
    { rotulo: 'Gastos', valor: totalGastos, cor: VERMELHO },
  ]

  const campo = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    borderRadius: 10,
    border: '1px solid #E4E7EC',
    fontSize: 16,
    background: '#FFFFFF',
  }
  const rotulo = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4A4A4A' }

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
          Financeiro
        </h1>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {[
            { valor: 'dia', rotulo: 'Dia' },
            { valor: 'mes', rotulo: 'Mês' },
            { valor: 'ano', rotulo: 'Ano' },
          ].map((opcao) => {
            const ativo = periodoTipo === opcao.valor
            return (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => setPeriodoTipo(opcao.valor)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: ativo ? 600 : 400,
                  background: ativo ? '#FFFFFF' : 'transparent',
                  color: ativo ? '#171717' : '#CFCFCF',
                  border: ativo ? 'none' : '1px solid #3A3A3A',
                  cursor: 'pointer',
                }}
              >
                {opcao.rotulo}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <button
            type="button"
            onClick={() => mudarPeriodo(-1)}
            aria-label="Período anterior"
            style={{ background: 'none', border: 'none', color: '#CFCFCF', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: '0 8px' }}
          >
            ‹
          </button>
          <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>
            {rotuloPeriodo(periodoTipo, dataReferencia)}
          </div>
          <button
            type="button"
            onClick={() => mudarPeriodo(1)}
            aria-label="Próximo período"
            style={{ background: 'none', border: 'none', color: '#CFCFCF', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: '0 8px' }}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {cardsTopo.map((card) => (
            <div key={card.rotulo} style={{ flex: '1 1 0', minWidth: 0, background: '#232323', borderRadius: 12, padding: 12 }}>
              <div style={{ color: '#CFCFCF', fontSize: 12 }}>{card.rotulo}</div>
              <div style={{ color: card.cor, fontSize: 15, fontWeight: 700, marginTop: 4, whiteSpace: 'nowrap' }}>
                {formatarValor(card.valor)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            background: '#232323',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <div style={{ color: '#CFCFCF', fontSize: 13 }}>Saldo do caixa</div>
          <div style={{ color: saldoCaixa < 0 ? VERMELHO : '#FFFFFF', fontSize: 17, fontWeight: 700 }}>
            {formatarSaldo(saldoCaixa)}
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 20px',
          overflowX: 'auto',
        }}
      >
        {filtros.map((filtro) => {
          const ativo = filtro === filtroAtivo
          return (
            <button
              key={filtro}
              type="button"
              onClick={() => setFiltroAtivo(filtro)}
              style={{
                flexShrink: 0,
                height: 36,
                padding: '0 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: ativo ? 600 : 400,
                background: ativo ? 'var(--mjr-navy)' : '#FFFFFF',
                color: ativo ? '#FFFFFF' : 'var(--mjr-navy)',
                border: ativo ? '1px solid #2a4f7f' : '1px solid #E2E0DC',
                cursor: 'pointer',
              }}
            >
              {filtro}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading && <div style={{ color: '#9aa0ad' }}>Carregando...</div>}
        {!loading && contas.length === 0 && (
          <div style={{ color: '#9aa0ad' }}>Nenhum lançamento cadastrado ainda.</div>
        )}
        {!loading && contas.length > 0 && contasFiltradas.length === 0 && (
          <div style={{ color: '#9aa0ad' }}>Nenhum lançamento para este filtro/período.</div>
        )}
        {!loading && contasFiltradas.length > 0 && secoes.map((secao) => (
          secao.contas.length === 0 ? null : (
          <section key={secao.titulo}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#9aa0ad',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
                textAlign: 'left',
              }}
            >
              {secao.titulo}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {secao.contas.map((conta, index) => {
                const estilo = estiloLinha(conta, hojeISO)
                return (
                  <div
                    key={conta.id ?? index}
                    onClick={() => abrirEdicao(conta)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'stretch',
                      background: '#FFFFFF',
                      border: '1px solid #E4E7EC',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ width: 4, background: estilo.cor }} />
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 16, fontWeight: 500, color: '#14202e', textAlign: 'left' }}>
                          {conta.clientes?.nome || conta.descricao}
                        </div>
                        {conta.clientes?.nome && conta.descricao && (
                          <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'left' }}>{conta.descricao}</div>
                        )}
                        <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'left' }}>
                          {estilo.texto}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <div style={{ fontWeight: 600, color: estilo.corValor }}>
                          {estilo.sinal && `${estilo.sinal} `}{formatarValor(conta.valor)}
                        </div>
                        <StatusTag tom={estilo.tom}>{estilo.tag}</StatusTag>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          )
        ))}
      </div>

      <BotaoFlutuante ativa={ativa && !mostrarForm} onClick={abrirNovo}>
        +
      </BotaoFlutuante>

      {mostrarForm && createPortal(
        <div
          onClick={fecharForm}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'mjr-fade 180ms ease-out',
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={salvar}
            style={{
              width: '100%',
              maxWidth: 520,
              boxSizing: 'border-box',
              maxHeight: '92dvh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: '20px 20px 0 0',
              padding: '16px 20px calc(env(safe-area-inset-bottom) + 20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              animation: 'mjr-sheet 240ms cubic-bezier(0.3, 0.7, 0.2, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#14202e' }}>
                {contaEditando ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
              <button
                type="button"
                onClick={fecharForm}
                aria-label="Fechar"
                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6b7280', display: 'flex' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, background: '#F1F2F4', padding: 4, borderRadius: 12 }}>
              {TIPOS_LANCAMENTO.map((t) => {
                const ativo = tipoLancamento === t.valor
                const cor = t.valor === 'gasto' ? '#C62E22' : t.valor === 'recebido' ? '#1A7F46' : 'var(--mjr-navy)'
                return (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => setTipoLancamento(t.valor)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 9,
                      border: 'none',
                      fontSize: 14,
                      fontWeight: ativo ? 700 : 500,
                      background: ativo ? '#FFFFFF' : 'transparent',
                      color: ativo ? cor : '#6b7280',
                      boxShadow: ativo ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {t.rotulo}
                  </button>
                )
              })}
            </div>

            <label style={rotulo}>
              Valor
              <CampoMoeda
                value={valor}
                onChange={setValor}
                required
                style={{ ...campo, fontSize: 28, fontWeight: 700, padding: '14px 12px', textAlign: 'center' }}
              />
            </label>
            <label style={rotulo}>
              Descrição
              <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} style={campo} />
            </label>
            <label style={rotulo}>
              {tipoLancamento === 'a_receber' ? 'Data de vencimento' : 'Data'}
              <input type="date" required value={data} onChange={(e) => setData(e.target.value)} style={campo} />
            </label>

            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: 14,
                borderRadius: 10,
                border: 'none',
                background: 'var(--mjr-navy)',
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: salvando ? 0.6 : 1,
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            {contaEditando && (
              <button
                type="button"
                onClick={excluir}
                disabled={salvando}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #a32d2d',
                  background: '#FFFFFF',
                  color: '#a32d2d',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Excluir
              </button>
            )}
          </form>
        </div>,
        document.body,
      )}
    </div>
  )
}

export default Financeiro
