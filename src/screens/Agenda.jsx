import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import StatusTag from '../components/StatusTag'
import BotaoFlutuante from '../components/BotaoFlutuante'
import FormAgendamento from '../components/FormAgendamento'
import { useScrollLock } from '../hooks/useScrollLock'

const ROTULOS_DIA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']

function paraISO(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// Segunda a sexta da semana de `base`; sábado e domingo caem na semana seguinte.
function diasDaSemana(base) {
  const dow = base.getDay()
  const deslocamento = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow
  return ROTULOS_DIA.map((label, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deslocamento + i)
    return { label, numero: d.getDate(), iso: paraISO(d) }
  })
}

// Datas ISO do mês de `d`, com null nos espaços antes do dia 1 (grid começa no domingo).
function celulasDoMes(d) {
  const ano = d.getFullYear()
  const mes = d.getMonth()
  const vazios = new Date(ano, mes, 1).getDay()
  const total = new Date(ano, mes + 1, 0).getDate()
  return [
    ...Array(vazios).fill(null),
    ...Array.from({ length: total }, (_, i) => paraISO(new Date(ano, mes, i + 1))),
  ]
}

function rotuloMes(d) {
  const texto = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(' de ', ' ')
}

function formatarData(data) {
  const [ano, mes, dia] = data.slice(0, 10).split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function formatarValor(valor) {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pluralizar(n, singular, plural) {
  return n === 1 ? singular : plural
}

// agendamento_id é unique em ordens_servico, então o PostgREST retorna objeto, não array.
function obterOsDoAgendamento(ag) {
  const os = ag.ordens_servico
  if (!os) return null
  return Array.isArray(os) ? os[0] ?? null : os
}

function calcularStatusAgendamento(ag) {
  const os = obterOsDoAgendamento(ag)
  if (os && os.status !== 'aberta') {
    return {
      label: 'Concluído',
      icone: '✓',
      corBorda: '#4C7A4E',
      tom: 'verde',
      os,
    }
  }
  const dataHora = ag.data && ag.hora ? new Date(`${ag.data.slice(0, 10)}T${ag.hora.slice(0, 5)}:00`) : null
  const jaPassou = dataHora ? dataHora.getTime() < Date.now() : false
  if (jaPassou) {
    return {
      label: 'Pendente',
      icone: '',
      corBorda: '#D97706',
      tom: 'ambar',
      os,
    }
  }
  return {
    label: 'Agendado',
    icone: '',
    corBorda: '#2563EB',
    tom: 'azul',
    os,
  }
}

function Agenda({ abrirOS, dataVersion, ativa }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [agendamentoEditando, setAgendamentoEditando] = useState(null)

  const [dataBase, setDataBase] = useState(() => new Date())
  const [diaSelecionado, setDiaSelecionado] = useState(() => paraISO(new Date()))
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  useScrollLock(mostrarCalendario)
  const [mesCalendario, setMesCalendario] = useState(() => new Date())

  function abrirEdicao(ag) {
    setAgendamentoEditando(ag)
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setAgendamentoEditando(null)
  }

  async function carregarAgendamentos() {
    const { data: dados, error } = await supabase
      .from('agendamentos')
      .select('*, clientes(nome), tipos_pelicula(nome), ordens_servico(id, status, valor_pago), agendamento_itens(*, servicos(nome, unidade))')
      .order('data', { ascending: true })
      .order('hora', { ascending: true })
    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
    } else {
      setAgendamentos(dados ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!ativa) return
    carregarAgendamentos()
  }, [dataVersion, ativa])

  // Ao abrir a Agenda / trocar de aba, volta ao topo para o cabeçalho não ficar sob a barra de status.
  useEffect(() => {
    if (ativa) window.scrollTo(0, 0)
  }, [ativa])

  async function aoSalvar() {
    fecharForm()
    await carregarAgendamentos()
  }

  async function excluir() {
    if (!window.confirm('Excluir este agendamento?')) return
    const { error } = await supabase.from('agendamentos').delete().eq('id', agendamentoEditando.id)
    if (error) {
      console.error('Erro ao excluir agendamento:', error)
      alert('Não foi possível excluir o agendamento. Tente novamente.')
      return
    }
    fecharForm()
    await carregarAgendamentos()
  }

  if (mostrarForm) {
    return (
      <FormAgendamento
        agendamento={agendamentoEditando}
        titulo={agendamentoEditando ? 'Editar agendamento' : 'Novo agendamento'}
        onSalvo={aoSalvar}
        onCancelar={fecharForm}
        onExcluir={excluir}
      />
    )
  }

  const dias = diasDaSemana(dataBase)
  const agendamentosDoDia = agendamentos.filter((ag) => ag.data?.slice(0, 10) === diaSelecionado)
  const concluidosDoDia = agendamentosDoDia.filter(
    (ag) => calcularStatusAgendamento(ag).label === 'Concluído'
  ).length

  function mudarSemana(delta) {
    const nova = new Date(dataBase)
    nova.setDate(nova.getDate() + delta * 7)
    setDataBase(nova)
  }

  function irParaHoje() {
    const hoje = new Date()
    setDataBase(hoje)
    setDiaSelecionado(paraISO(hoje))
  }

  function mudarMes(delta) {
    setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + delta, 1))
  }

  function selecionarDoCalendario(iso) {
    const [ano, mes, dia] = iso.split('-').map(Number)
    setDiaSelecionado(iso)
    setDataBase(new Date(ano, mes - 1, dia))
    setMostrarCalendario(false)
  }

  const diasComAgendamento = new Set(agendamentos.map((ag) => ag.data?.slice(0, 10)))

  const botaoPequeno = {
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid #3A3A3A',
    background: '#232323',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }

  const seta = {
    flexShrink: 0,
    width: 28,
    background: 'none',
    border: 'none',
    color: '#CFCFCF',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
  }

  const setaCalendario = {
    ...seta,
    position: 'relative',
    zIndex: 20,
    width: 44,
    minWidth: 44,
    height: 44,
    minHeight: 44,
  }

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            Agenda
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setMesCalendario(dataBase)
                setMostrarCalendario(true)
              }}
              aria-label="Abrir calendário"
              style={{ ...botaoPequeno, fontSize: 14 }}
            >
              📅
            </button>
            <button type="button" onClick={irParaHoje} style={botaoPequeno}>
              Hoje
            </button>
          </div>
        </div>

        <div style={{ color: '#CFCFCF', fontSize: 12, marginTop: 12 }}>
          {rotuloMes(dataBase)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <button type="button" onClick={() => mudarSemana(-1)} aria-label="Semana anterior" style={seta}>
            ‹
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            {dias.map((dia) => {
              const ativo = dia.iso === diaSelecionado
              return (
                <div
                  key={dia.iso}
                  onClick={() => setDiaSelecionado(dia.iso)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 10,
                    padding: '10px 0',
                    cursor: 'pointer',
                    background: ativo ? 'var(--mjr-navy)' : '#232323',
                    color: ativo ? '#FFFFFF' : '#CFCFCF',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{dia.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{dia.numero}</span>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => mudarSemana(1)} aria-label="Próxima semana" style={seta}>
            ›
          </button>
        </div>
      </header>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading && <div style={{ color: '#9aa0ad' }}>Carregando...</div>}
        {!loading && agendamentosDoDia.length === 0 && (
          <div style={{ color: '#9aa0ad' }}>Nenhum agendamento neste dia.</div>
        )}
        {!loading && agendamentosDoDia.length > 0 && (
          <section>
            <div style={{ fontWeight: 700, color: '#f2f3f5' }}>{formatarData(diaSelecionado)}</div>
            <div style={{ fontSize: 12, color: '#9aa0ad', marginTop: 2, marginBottom: 12 }}>
              {agendamentosDoDia.length} {pluralizar(agendamentosDoDia.length, 'serviço', 'serviços')} · {concluidosDoDia}{' '}
              {pluralizar(concluidosDoDia, 'concluído', 'concluídos')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {agendamentosDoDia.map((item, index) => {
                const status = calcularStatusAgendamento(item)
                const concluido = status.label === 'Concluído'
                const valorExibido = concluido ? status.os?.valor_pago : item.valor
                const servicoPelicula = [item.servico, item.tipos_pelicula?.nome, item.veiculo_modelo].filter(Boolean).join(' · ')
                return (
                  <div key={item.id ?? index} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 48, flexShrink: 0, fontWeight: 700 }}>
                      {item.hora?.slice(0, 5)}
                    </div>
                    <div
                      onClick={() => {
                        if (concluido && status.os) {
                          abrirOS?.(status.os.id, 'detalhes')
                        } else {
                          abrirEdicao(item)
                        }
                      }}
                      style={{
                        flex: 1,
                        background: '#FFFFFF',
                        border: '1px solid #E4E7EC',
                        borderLeft: `4px solid ${status.corBorda}`,
                        borderRadius: 14,
                        padding: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 500, color: '#14202e' }}>
                          {item.clientes?.nome || 'Sem cliente'}
                        </span>
                        <StatusTag tom={status.tom}>
                          {status.icone ? `${status.icone} ` : ''}{status.label}
                        </StatusTag>
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {servicoPelicula}
                      </div>
                      {valorExibido != null && (
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mjr-navy)', textAlign: 'right' }}>
                          {formatarValor(valorExibido)}
                        </div>
                      )}
                      {!concluido && status.os && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirOS?.(status.os.id, 'fechar')
                          }}
                          style={{
                            marginTop: 4,
                            alignSelf: 'flex-start',
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: '1px solid #171717',
                            background: '#FFFFFF',
                            color: '#171717',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Fechar OS
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <BotaoFlutuante
        ativa={ativa}
        onClick={() => {
          setAgendamentoEditando(null)
          setMostrarForm(true)
        }}
      >
        +
      </BotaoFlutuante>

      {mostrarCalendario && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--mjr-header)',
            overflowY: 'auto',
            padding: '0 20px 24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              background: 'var(--mjr-header)',
              paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
              paddingBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" style={setaCalendario}>
              ‹
            </button>
            <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>
              {rotuloMes(mesCalendario)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" style={setaCalendario}>
                ›
              </button>
              <button
                type="button"
                onClick={() => setMostrarCalendario(false)}
                aria-label="Fechar calendário"
                style={{ ...setaCalendario, fontSize: 20, marginLeft: 8 }}
              >
                ✕
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              marginTop: 20,
            }}
          >
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((rotulo) => (
              <div
                key={rotulo}
                style={{ textAlign: 'center', color: '#9A9A9A', fontSize: 11, fontWeight: 600 }}
              >
                {rotulo}
              </div>
            ))}
            {celulasDoMes(mesCalendario).map((iso, i) => {
              if (!iso) return <div key={`vazio-${i}`} />
              const ativo = iso === diaSelecionado
              return (
                <div
                  key={iso}
                  onClick={() => selecionarDoCalendario(iso)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: ativo ? 'var(--mjr-navy)' : '#232323',
                    color: ativo ? '#FFFFFF' : '#CFCFCF',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {Number(iso.slice(8))}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: diasComAgendamento.has(iso)
                        ? ativo ? '#FFFFFF' : 'var(--mjr-navy)'
                        : 'transparent',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Agenda