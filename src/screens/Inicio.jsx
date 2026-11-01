import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import StatusTag from '../components/StatusTag'
import { mesAtualSP, limitesDoMes, dataLocalSP, mesDeslocado, nomeMes, chaveMes } from '../utils/periodo'

// Data local (YYYY-MM-DD); toISOString usaria UTC e viraria o dia à noite no Brasil.
function hojeISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatarReais(valor) {
  return `R$ ${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatarDataCurta(data) {
  const [, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

// agendamento_id é unique em ordens_servico, então o PostgREST retorna objeto, não array.
function obterOsDoAgendamento(ag) {
  const os = ag.ordens_servico
  if (!os) return null
  return Array.isArray(os) ? os[0] ?? null : os
}

function estaPendente(ag) {
  if (!ag.data || !ag.hora) return false
  const dataHora = new Date(`${ag.data.slice(0, 10)}T${ag.hora.slice(0, 5)}:00`)
  return dataHora.getTime() < Date.now()
}

const LIMITE_ALERTA_M = 5

function Inicio({ setActiveTab, dataVersion, ativa }) {
  const [clientes, setClientes] = useState([])
  const [itensEstoque, setItensEstoque] = useState([])
  const [contas, setContas] = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [osFechadas, setOsFechadas] = useState({ anterior: 0, retrasado: 0 })
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const mesAnterior = mesDeslocado(mesAtualSP(), -1)
    const contarFechadas = (mes) => {
      const { inicio, fim } = limitesDoMes(mes)
      return supabase
        .from('ordens_servico')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'aberta')
        .gte('fechada_em', inicio)
        .lt('fechada_em', fim)
    }
    const [cli, est, fin, ag, osAnt, osRetr] = await Promise.all([
      supabase.from('clientes').select('*'),
      supabase.from('estoque').select('*, tipos_pelicula(nome, ativo)'),
      supabase.from('financeiro').select('*'),
      supabase
        .from('agendamentos')
        .select('*, clientes(nome), ordens_servico(status)')
        .order('data')
        .order('hora'),
      contarFechadas(mesAnterior),
      contarFechadas(mesDeslocado(mesAnterior, -1)),
    ])
    setClientes(cli.data ?? [])
    setItensEstoque(est.data ?? [])
    setContas(fin.data ?? [])
    setAgendamentos(ag.data ?? [])
    setOsFechadas({ anterior: osAnt.count ?? 0, retrasado: osRetr.count ?? 0 })
    setLoading(false)
  }

  // Busca ao montar, ao voltar para a aba e quando os dados mudam (sem spinner após a 1ª carga).
  useEffect(() => {
    if (ativa) carregar()
  }, [dataVersion, ativa])

  const hoje = hojeISO()
  const aReceber = contas
    .filter((c) => c.tipo === 'a_receber' && c.status === 'aberto')
    .reduce((s, c) => s + Number(c.valor), 0)
  const estoqueBaixo = itensEstoque.filter((i) => i.status === 'ativo' && i.tipos_pelicula?.ativo !== false && Number(i.metragem_atual) < LIMITE_ALERTA_M)

  const agendamentosAbertos = agendamentos.filter((a) => {
    const os = obterOsDoAgendamento(a)
    return os && os.status === 'aberta'
  })
  const proximos = [...agendamentosAbertos]
    .sort((a, b) => {
      const aPendente = estaPendente(a)
      const bPendente = estaPendente(b)
      if (aPendente !== bPendente) return aPendente ? -1 : 1
      return `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`)
    })
    .slice(0, 5)

  const agendamentosHoje = agendamentos.filter((a) => a.data === hoje)
  const concluidosHoje = agendamentosHoje.filter((a) => {
    const os = obterOsDoAgendamento(a)
    return os && os.status !== 'aberta'
  }).length

  const stats = [
    { label: 'Clientes ativos', value: clientes.length },
    {
      label: 'Instalações hoje',
      value: `${concluidosHoje} de ${agendamentosHoje.length} concluídas`,
      small: true,
    },
    { label: 'A receber no mês', value: formatarReais(aReceber), cor: '#1A7F46' },
    {
      label: 'Estoque baixo',
      value: estoqueBaixo.length,
      alert: estoqueBaixo.length > 0,
    },
  ]

  const mesAnterior = mesDeslocado(mesAtualSP(), -1)
  const mesRetrasado = mesDeslocado(mesAnterior, -1)
  const recebidoNoMes = (mes) => contas
    .filter((c) => c.tipo === 'a_receber' && c.status === 'pago' && dataLocalSP(c.pago_em)?.slice(0, 7) === chaveMes(mes))
    .reduce((s, c) => s + Number(c.valor), 0)
  const recebidoAnterior = recebidoNoMes(mesAnterior)
  const recebidoRetrasado = recebidoNoMes(mesRetrasado)
  const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1)
  const nomeRetrasado = nomeMes(mesRetrasado)
  const nomeRetrasadoCap = maiuscula(nomeRetrasado)

  // Com 5+ OS no mês retrasado mostra a variação em %; com menos, o valor dele.
  const comparacao = (atual, retrasado, textoValor) => {
    if (osFechadas.retrasado >= 5 && retrasado > 0) {
      const pct = Math.round(((atual - retrasado) / retrasado) * 100)
      return {
        cor: pct > 0 ? '#1A7F46' : pct < 0 ? '#C62E22' : '#6b7280',
        texto: `${pct > 0 ? '+' : ''}${pct}% vs. ${nomeRetrasado}`,
      }
    }
    const semDado = osFechadas.retrasado === 0 && recebidoRetrasado === 0
    return { cor: '#6b7280', texto: `${nomeRetrasadoCap}: ${semDado ? '—' : textoValor}` }
  }

  const cartoesMes = [
    {
      label: 'Recebido',
      cor: '#1A7F46',
      value: formatarReais(recebidoAnterior),
      comparacao: comparacao(recebidoAnterior, recebidoRetrasado, formatarReais(recebidoRetrasado)),
    },
    {
      label: 'OS fechadas',
      value: osFechadas.anterior,
      comparacao: comparacao(osFechadas.anterior, osFechadas.retrasado, `${osFechadas.retrasado} OS`),
    },
  ]
  const cartaoMes = { background: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }

  const dataHoje = (() => {
    const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  })()

  if (loading) {
    return <div style={{ padding: 20, color: '#9aa0ad' }}>Carregando...</div>
  }

  return (
    <div style={{ paddingBottom: 'calc(var(--nav-bottom) + 100px)' }}>
      <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          <span style={{ color: '#FFFFFF' }}>MJR</span>{' '}
          <span style={{ color: 'var(--mjr-red)' }}>Film</span>
        </h1>
        <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
          Insulfilm automotivo e arquitetônico
        </p>
      </header>

      <div style={{ padding: 20 }}>
        <p style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 14, color: '#9aa0ad' }}>
          {dataHoje}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 28,
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${stat.alert ? 'var(--mjr-red)' : '#E4E7EC'}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: stat.small ? 16 : 22,
                  fontWeight: 500,
                  color: stat.alert ? '#C62E22' : stat.cor ?? '#14304d',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f2f3f5' }}>
              Mês anterior · {maiuscula(nomeMes(mesAnterior))}
            </h3>
            <button
              onClick={() => setActiveTab('financeiro')}
              style={{ color: '#7db2ff', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Ver financeiro
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {cartoesMes.map((c) => (
              <div key={c.label} style={cartaoMes}>
                <div style={{ fontSize: 22, fontWeight: 500, color: c.cor ?? '#14304d' }}>{c.value}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: c.comparacao.cor, fontWeight: 400, marginTop: 4 }}>
                  {c.comparacao.texto}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f2f3f5' }}>
              Próximos agendamentos
            </h3>
            <button
              onClick={() => setActiveTab('agenda')}
              style={{ color: '#7db2ff', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Ver agenda
            </button>
          </div>

          {proximos.length === 0 && (
            <p style={{ margin: 0, color: '#9aa0ad' }}>Nenhum agendamento em aberto.</p>
          )}
          {proximos.map((item) => {
            const pendente = estaPendente(item)
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#FFFFFF',
                  border: '1px solid #E4E7EC',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>📅</span>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#14202e', textAlign: 'left' }}>
                    {item.clientes?.nome || 'Sem cliente'}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'left' }}>
                    {item.servico}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {pendente ? (
                    <StatusTag tom="ambar">Pendente</StatusTag>
                  ) : (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--mjr-navy)' }}>
                        {formatarDataCurta(item.data)}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {item.hora?.slice(0, 5)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f2f3f5' }}>
              Alertas de estoque
            </h3>
            <button
              onClick={() => setActiveTab('estoque')}
              style={{ color: '#7db2ff', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Ver estoque
            </button>
          </div>

          {estoqueBaixo.length === 0 && (
            <p style={{ margin: 0, color: '#9aa0ad' }}>Estoque em dia.</p>
          )}
          {estoqueBaixo.map((i) => (
            <div
              key={i.id}
              style={{
                background: '#FCF3F1',
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
              }}
            >
              {i.tipos_pelicula?.nome || 'Tipo removido'} ({i.identificacao}) — restam {i.metragem_atual} m
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

export default Inicio
