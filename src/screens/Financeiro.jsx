import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'

const filtros = ['Todos', 'A receber', 'Recebidas', 'A pagar', 'Vencidas']

function formatarValor(valor) {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function estiloLinha(conta, hojeISO) {
  if (conta.status === 'pago') {
    if (conta.tipo === 'a_receber') {
      return { cor: '#4C7A4E', texto: `Recebido em ${formatarData(conta.pago_em)}` }
    }
    return { cor: '#8A8A8A', texto: `Pago em ${formatarData(conta.pago_em)}` }
  }
  if (estaVencida(conta, hojeISO)) {
    return { cor: '#A6332C', texto: `Venceu em ${formatarData(conta.vencimento)}` }
  }
  return { cor: '#8A8A8A', texto: `Vence em ${formatarData(conta.vencimento)}` }
}

function Financeiro() {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('a_receber')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
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

  function limparCampos() {
    setDescricao('')
    setTipo('a_receber')
    setValor('')
    setVencimento('')
  }

  function abrirEdicao(conta) {
    setContaEditando(conta)
    setDescricao(conta.descricao ?? '')
    setTipo(conta.tipo ?? 'a_receber')
    setValor(String(conta.valor ?? ''))
    setVencimento(conta.vencimento ? conta.vencimento.slice(0, 10) : '')
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setContaEditando(null)
    limparCampos()
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
    carregarContas()
  }, [])

  async function salvar(e) {
    e.preventDefault()
    if (contaEditando && !window.confirm('Salvar alterações deste lançamento?')) return
    setSalvando(true)
    const dados = { descricao, tipo, valor: Number(valor), vencimento }
    const { error } = contaEditando
      ? await supabase.from('financeiro').update(dados).eq('id', contaEditando.id)
      : await supabase.from('financeiro').insert({ ...dados, status: 'aberto' })
    setSalvando(false)
    if (error) {
      console.error('Erro ao salvar conta:', error)
      alert('Não foi possível salvar a conta. Tente novamente.')
      return
    }
    fecharForm()
    await carregarContas()
  }

  async function alternarStatus() {
    const novoStatus = contaEditando.status === 'pago' ? 'aberto' : 'pago'
    if (!window.confirm(`Marcar como ${novoStatus}?`)) return
    setSalvando(true)
    const { error } = await supabase
      .from('financeiro')
      .update({ status: novoStatus })
      .eq('id', contaEditando.id)
    setSalvando(false)
    if (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Não foi possível atualizar o status. Tente novamente.')
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
      alert('Não foi possível excluir a conta. Tente novamente.')
      return
    }
    fecharForm()
    await carregarContas()
  }

  if (mostrarForm) {
    const campo = {
      width: '100%',
      boxSizing: 'border-box',
      padding: '12px',
      borderRadius: 10,
      border: '1px solid #E4E7EC',
      fontSize: 14,
      background: '#FFFFFF',
    }
    const rotulo = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4A4A4A' }
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {contaEditando ? 'Editar lançamento' : 'Novo lançamento'}
          </h1>
        </header>
        <form
          onSubmit={salvar}
          style={{
            padding: '20px 20px calc(140px + env(safe-area-inset-bottom, 0px)) 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <label style={rotulo}>
            Descrição
            <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} style={campo} />
          </label>
          <label style={rotulo}>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={campo}>
              <option value="a_receber">A receber</option>
              <option value="a_pagar">A pagar</option>
            </select>
          </label>
          <label style={rotulo}>
            Valor
            <CampoMoeda value={valor} onChange={setValor} required style={campo} />
          </label>
          <label style={rotulo}>
            Vencimento
            <input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} style={campo} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={fecharForm}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: '1px solid #E4E7EC',
                background: '#FFFFFF',
                color: '#4A4A4A',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: 'none',
                background: '#14304D',
                color: '#FFFFFF',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: salvando ? 0.6 : 1,
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          {contaEditando && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={alternarStatus}
                disabled={salvando}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #171717',
                  background: '#FFFFFF',
                  color: '#171717',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {contaEditando.status === 'pago' ? 'Marcar como aberto' : 'Marcar como pago'}
              </button>
              <button
                type="button"
                onClick={excluir}
                disabled={salvando}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #A6332C',
                  background: '#FFFFFF',
                  color: '#A6332C',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Excluir
              </button>
            </div>
          )}
        </form>
      </div>
    )
  }

  const hojeISO = paraISO(new Date())
  const intervalo = calcularIntervaloPeriodo(periodoTipo, dataReferencia)

  const totalAReceber = contas
    .filter((c) => c.tipo === 'a_receber' && c.status === 'aberto' && dentroDoPeriodo(c, intervalo))
    .reduce((s, c) => s + Number(c.valor), 0)
  const totalRecebido = contas
    .filter((c) => c.tipo === 'a_receber' && c.status === 'pago' && dentroDoPeriodo(c, intervalo))
    .reduce((s, c) => s + Number(c.valor), 0)
  const totalAPagar = contas
    .filter((c) => c.tipo === 'a_pagar' && c.status === 'aberto' && dentroDoPeriodo(c, intervalo))
    .reduce((s, c) => s + Number(c.valor), 0)

  const contasFiltradas = contas.filter((c) => {
    if (filtroAtivo === 'Vencidas') return estaVencida(c, hojeISO)
    if (filtroAtivo === 'A receber' && !(c.tipo === 'a_receber' && c.status === 'aberto')) return false
    if (filtroAtivo === 'Recebidas' && !(c.tipo === 'a_receber' && c.status === 'pago')) return false
    if (filtroAtivo === 'A pagar' && c.tipo !== 'a_pagar') return false
    return dentroDoPeriodo(c, intervalo)
  })

  const secoes = [
    { titulo: 'Em aberto', contas: contasFiltradas.filter((c) => c.status === 'aberto') },
    { titulo: 'Pagas / recebidas', contas: contasFiltradas.filter((c) => c.status === 'pago') },
  ]

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
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

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 100px', background: '#232323', borderRadius: 12, padding: 14 }}>
            <div style={{ color: '#CFCFCF', fontSize: 13 }}>A receber</div>
            <div style={{ color: '#6FAE72', fontSize: 17, fontWeight: 700, marginTop: 4 }}>
              {formatarValor(totalAReceber)}
            </div>
          </div>
          <div style={{ flex: '1 1 100px', background: '#232323', borderRadius: 12, padding: 14 }}>
            <div style={{ color: '#CFCFCF', fontSize: 13 }}>Recebido</div>
            <div style={{ color: '#6FAE72', fontSize: 17, fontWeight: 700, marginTop: 4 }}>
              {formatarValor(totalRecebido)}
            </div>
          </div>
          <div style={{ flex: '1 1 100px', background: '#232323', borderRadius: 12, padding: 14 }}>
            <div style={{ color: '#CFCFCF', fontSize: 13 }}>A pagar</div>
            <div style={{ color: '#C97A73', fontSize: 17, fontWeight: 700, marginTop: 4 }}>
              {formatarValor(totalAPagar)}
            </div>
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
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: ativo ? 600 : 400,
                background: ativo ? '#171717' : '#FFFFFF',
                color: ativo ? '#FFFFFF' : '#8A8A8A',
                border: ativo ? 'none' : '1px solid #E2E0DC',
                cursor: 'pointer',
              }}
            >
              {filtro}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
        {!loading && contas.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhuma conta cadastrada ainda.</div>
        )}
        {!loading && contas.length > 0 && contasFiltradas.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhum lançamento para este filtro/período.</div>
        )}
        {!loading && contasFiltradas.length > 0 && secoes.map((secao) => (
          secao.contas.length === 0 ? null : (
          <section key={secao.titulo}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#8A8A8A',
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
                        <div style={{ fontWeight: 600, textAlign: 'left' }}>
                          {conta.clientes?.nome || conta.descricao}
                        </div>
                        <div style={{ fontSize: 13, color: '#8A8A8A', textAlign: 'left' }}>
                          {estilo.texto}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{formatarValor(conta.valor)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          )
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setContaEditando(null)
          limparCampos()
          setMostrarForm(true)
        }}
        className="fab"
      >
        +
      </button>
    </div>
  )
}

export default Financeiro
