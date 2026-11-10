import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import BotaoFlutuante from '../components/BotaoFlutuante'
import { CabecalhoTela, CorpoTela, TituloSecao, ListaCartoes, LinhaLista, Filtros, BottomSheet, RodapeSheet, SeletorSegmentado, estiloCampo, estiloRotulo } from '../components/ui'

const filtros = ['Todos', 'Recebidos', 'A receber', 'Gastos']

// Tipos de lançamento no modal. Mapeiam para o modelo atual da tabela financeiro:
// recebido = a_receber/pago, a_receber = a_receber/aberto, gasto = a_pagar/pago.
const TIPOS_LANCAMENTO = [
  { valor: 'recebido', rotulo: 'Recebido' },
  { valor: 'a_receber', rotulo: 'A receber' },
  { valor: 'gasto', rotulo: 'Gasto' },
]


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

function Financeiro({ dataVersion, ativa, alvoFinanceiro }) {
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

  // Atalhos vindos do Início: abre já no filtro e no mês pedidos.
  useEffect(() => {
    if (!alvoFinanceiro) return
    if (alvoFinanceiro.filtro) setFiltroAtivo(alvoFinanceiro.filtro)
    if (alvoFinanceiro.data) {
      const [ano, mes] = alvoFinanceiro.data.split('-').map(Number)
      setPeriodoTipo('mes')
      setDataReferencia(new Date(ano, mes - 1, 1))
    }
  }, [alvoFinanceiro])

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
    { rotulo: 'Recebido', valor: totalRecebido, cor: '#6fcf8a' },
    { rotulo: 'A receber', valor: totalAReceber, cor: '#f2b84b' },
    { rotulo: 'Gastos', valor: totalGastos, cor: totalGastos > 0 ? '#ff9b90' : '#b8bdc9' },
  ]


  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <CabecalhoTela titulo="Financeiro">
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
            <div key={card.rotulo} style={{ flex: '1 1 0', minWidth: 0, background: '#1d2029', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 12 }}>
              <div style={{ color: '#b8bdc9', fontSize: 12 }}>{card.rotulo}</div>
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
            background: '#1d2029',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          <div style={{ color: '#b8bdc9', fontSize: 13 }}>Saldo do caixa</div>
          <div style={{ color: saldoCaixa < 0 ? '#ff9b90' : '#FFFFFF', fontSize: 17, fontWeight: 700 }}>
            {formatarSaldo(saldoCaixa)}
          </div>
        </div>
      </CabecalhoTela>

      <Filtros opcoes={filtros} ativo={filtroAtivo} onChange={setFiltroAtivo} />

      <CorpoTela>
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
            <TituloSecao>{secao.titulo}</TituloSecao>
            <ListaCartoes>
              {secao.contas.map((conta, index) => {
                const estilo = estiloLinha(conta, hojeISO)
                return (
                  <LinhaLista
                    key={conta.id ?? index}
                    onClick={() => abrirEdicao(conta)}
                    cor={estilo.cor}
                    nome={conta.clientes?.nome || conta.descricao}
                    apoio={[conta.clientes?.nome && conta.descricao ? conta.descricao : null, estilo.texto]}
                    direita={
                      <div style={{ fontWeight: 600, color: estilo.corValor }}>
                        {estilo.sinal && `${estilo.sinal} `}{formatarValor(conta.valor)}
                      </div>
                    }
                    etiqueta={{ tom: estilo.tom, texto: estilo.tag }}
                  />
                )
              })}
            </ListaCartoes>
          </section>
          )
        ))}
      </CorpoTela>

      <BotaoFlutuante ativa={ativa && !mostrarForm} onClick={abrirNovo}>
        +
      </BotaoFlutuante>

      {mostrarForm && (
        <BottomSheet
          titulo={contaEditando ? 'Editar lançamento' : 'Novo lançamento'}
          onFechar={fecharForm}
          onSubmit={salvar}
          rodape={<RodapeSheet salvando={salvando} onExcluir={contaEditando ? excluir : undefined} />}
        >
          <SeletorSegmentado
            opcoes={TIPOS_LANCAMENTO.map((t) => ({
              ...t,
              cor: t.valor === 'gasto' ? '#C62E22' : t.valor === 'recebido' ? '#1A7F46' : 'var(--mjr-navy)',
            }))}
            valor={tipoLancamento}
            onChange={setTipoLancamento}
          />

          <label style={estiloRotulo}>
            Valor
            <CampoMoeda
              value={valor}
              onChange={setValor}
              required
              style={{ ...estiloCampo, fontSize: 28, fontWeight: 700, padding: '14px 12px', textAlign: 'center' }}
            />
          </label>
          <label style={estiloRotulo}>
            Descrição
            <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} style={estiloCampo} />
          </label>
          <label style={estiloRotulo}>
            {tipoLancamento === 'a_receber' ? 'Data de vencimento' : 'Data'}
            <input type="date" required value={data} onChange={(e) => setData(e.target.value)} style={estiloCampo} />
          </label>
        </BottomSheet>
      )}
    </div>
  )
}

export default Financeiro
