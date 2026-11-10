import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { mesAtualSP, dataLocalSP, mesDeslocado, nomeMes, chaveMes } from '../utils/periodo'

const DIAS_VENCE_EM_BREVE = 7

// Data local (YYYY-MM-DD); toISOString usaria UTC e viraria o dia à noite no Brasil.
function paraISO(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatarReais(valor) {
  return `${valor < 0 ? '-' : ''}R$ ${Math.abs(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatarDataCurta(data) {
  const [, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const somar = (lista) => lista.reduce((s, c) => s + Number(c.valor), 0)

const ehRecebido = (c) => c.tipo === 'a_receber' && c.status === 'pago'
const ehAReceber = (c) => c.tipo === 'a_receber' && c.status === 'aberto'
const ehGasto = (c) => c.tipo === 'a_pagar' && c.status === 'pago'

function Inicio({ setActiveTab, dataVersion, ativa }) {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    const { data, error } = await supabase.from('financeiro').select('*, clientes(nome)')
    if (error) console.error('Erro ao buscar financeiro:', error)
    else setContas(data ?? [])
    setLoading(false)
  }

  // Busca ao montar, ao voltar para a aba e quando os dados mudam (sem spinner após a 1ª carga).
  useEffect(() => {
    if (ativa) carregar()
  }, [dataVersion, ativa])

  const hoje = paraISO(new Date())
  const limiteBreve = (() => {
    const d = new Date()
    d.setDate(d.getDate() + DIAS_VENCE_EM_BREVE)
    return paraISO(d)
  })()

  const mesAtual = mesAtualSP()
  const mesAnterior = mesDeslocado(mesAtual, -1)
  const diaEm = (c) => (c.status === 'pago' ? dataLocalSP(c.pago_em) : c.vencimento?.slice(0, 10)) ?? ''
  const noMes = (mes) => (c) => diaEm(c).slice(0, 7) === chaveMes(mes)

  const doMes = contas.filter(noMes(mesAtual))
  const recebido = somar(doMes.filter(ehRecebido))
  const aReceber = somar(doMes.filter(ehAReceber))
  const gastos = somar(doMes.filter(ehGasto))
  const saldo = recebido - gastos

  const doAnterior = contas.filter(noMes(mesAnterior))
  const recebidoAnterior = somar(doAnterior.filter(ehRecebido))
  const gastosAnterior = somar(doAnterior.filter(ehGasto))

  const porVencimento = (a, b) => a.vencimento.localeCompare(b.vencimento)
  const vencidas = contas
    .filter((c) => ehAReceber(c) && c.vencimento && c.vencimento.slice(0, 10) < hoje)
    .sort(porVencimento)
  const venceEmBreve = contas
    .filter((c) => ehAReceber(c) && c.vencimento && c.vencimento.slice(0, 10) >= hoje && c.vencimento.slice(0, 10) <= limiteBreve)
    .sort(porVencimento)

  const cartoesMes = [
    { label: 'Recebido', value: formatarReais(recebido), cor: '#1A7F46' },
    { label: 'A receber', value: formatarReais(aReceber), cor: '#14304d' },
    { label: 'Gastos', value: formatarReais(gastos), cor: '#C62E22' },
    { label: 'Saldo', value: formatarReais(saldo), cor: saldo < 0 ? '#C62E22' : '#14304d' },
  ]

  const cartao = { background: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }
  const tituloSecao = { margin: 0, fontSize: 16, fontWeight: 600, color: '#f2f3f5' }
  const linkVer = { color: '#7db2ff', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }

  const dataHoje = maiuscula(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))

  function renderContas(lista, vazio, corData) {
    if (lista.length === 0) return <p style={{ margin: 0, color: '#9aa0ad' }}>{vazio}</p>
    return lista.map((c) => (
      <div
        key={c.id}
        style={{ ...cartao, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}
      >
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#14202e' }}>
            {c.clientes?.nome || c.descricao}
          </div>
          {c.clientes?.nome && c.descricao && (
            <div style={{ fontSize: 13, color: '#6b7280' }}>{c.descricao}</div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: 'var(--mjr-navy)' }}>{formatarReais(Number(c.valor))}</div>
          <div style={{ fontSize: 12, color: corData }}>{formatarDataCurta(c.vencimento)}</div>
        </div>
      </div>
    ))
  }

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
        <p style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 14, color: '#f2f3f5' }}>
          {dataHoje}
        </p>

        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={tituloSecao}>{maiuscula(nomeMes(mesAtual))}</h3>
            <button onClick={() => setActiveTab('financeiro')} style={linkVer}>Ver financeiro</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {cartoesMes.map((c) => (
              <div key={c.label} style={cartao}>
                <div style={{ fontSize: 20, fontWeight: 500, color: c.cor }}>{c.value}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={tituloSecao}>Vencidas</h3>
            <button onClick={() => setActiveTab('financeiro')} style={linkVer}>Ver financeiro</button>
          </div>
          {renderContas(vencidas, "Nenhuma conta vencida.", "#C62E22")}
        </section>

        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={tituloSecao}>Vence em breve</h3>
            <button onClick={() => setActiveTab('financeiro')} style={linkVer}>Ver financeiro</button>
          </div>
          {renderContas(venceEmBreve, `Nada vence nos próximos ${DIAS_VENCE_EM_BREVE} dias.`, "#6b7280")}
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={tituloSecao}>Mês anterior · {maiuscula(nomeMes(mesAnterior))}</h3>
            <button onClick={() => setActiveTab('financeiro')} style={linkVer}>Ver financeiro</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={cartao}>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#1A7F46' }}>{formatarReais(recebidoAnterior)}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Recebido</div>
            </div>
            <div style={cartao}>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#C62E22' }}>{formatarReais(gastosAnterior)}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Gastos</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Inicio
