import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

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

function Inicio({ setActiveTab }) {
  const [clientes, setClientes] = useState([])
  const [itensEstoque, setItensEstoque] = useState([])
  const [contas, setContas] = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [cli, est, fin, ag] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('estoque').select('*, tipos_pelicula(nome)'),
        supabase.from('financeiro').select('*'),
        supabase
          .from('agendamentos')
          .select('*, clientes(nome), ordens_servico(status)')
          .order('data')
          .order('hora'),
      ])
      setClientes(cli.data ?? [])
      setItensEstoque(est.data ?? [])
      setContas(fin.data ?? [])
      setAgendamentos(ag.data ?? [])
      setLoading(false)
    }
    carregar()
  }, [])

  const hoje = hojeISO()
  const aReceber = contas
    .filter((c) => c.tipo === 'a_receber' && c.status === 'aberto')
    .reduce((s, c) => s + Number(c.valor), 0)
  const estoqueBaixo = itensEstoque.filter((i) => i.status === 'ativo' && Number(i.metragem_atual) < LIMITE_ALERTA_M)

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
    { label: 'A receber no mês', value: formatarReais(aReceber) },
    {
      label: 'Estoque baixo',
      value: estoqueBaixo.length,
      alert: estoqueBaixo.length > 0,
    },
  ]

  if (loading) {
    return <div style={{ padding: 20, color: '#8A8A8A' }}>Carregando...</div>
  }

  return (
    <div style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: '#171717', padding: '24px 20px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          <span style={{ color: '#FFFFFF' }}>MJR</span>{' '}
          <span style={{ color: '#A6332C' }}>Film</span>
        </h1>
        <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
          Insulfilm automotivo e arquitetônico
        </p>
      </header>

      <div style={{ padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Olá, MJR Film</h2>
        <p style={{ margin: '4px 0 20px', color: '#8A8A8A' }}>
          Resumo do seu negócio hoje
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
                border: `1px solid ${stat.alert ? '#A6332C' : '#E4E7EC'}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: stat.small ? 16 : 22,
                  fontWeight: 700,
                  color: stat.alert ? '#A6332C' : '#171717',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>
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
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Próximos agendamentos
            </h3>
            <button
              onClick={() => setActiveTab('agenda')}
              style={{ color: '#14304D', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Ver agenda
            </button>
          </div>

          {proximos.length === 0 && (
            <p style={{ margin: 0, color: '#8A8A8A' }}>Nenhum agendamento em aberto.</p>
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
                  <div style={{ fontWeight: 600, textAlign: 'left' }}>
                    {item.clientes?.nome || 'Sem cliente'}
                  </div>
                  <div style={{ fontSize: 13, color: '#8A8A8A', textAlign: 'left' }}>
                    {item.servico}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {pendente ? (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: '#FEF3C7',
                        color: '#92400E',
                      }}
                    >
                      Pendente
                    </span>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {formatarDataCurta(item.data)}
                      </div>
                      <div style={{ fontSize: 12, color: '#8A8A8A' }}>
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
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Alertas de estoque
            </h3>
            <button
              onClick={() => setActiveTab('estoque')}
              style={{ color: '#14304D', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Ver estoque
            </button>
          </div>

          {estoqueBaixo.length === 0 && (
            <p style={{ margin: 0, color: '#8A8A8A' }}>Estoque em dia.</p>
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
