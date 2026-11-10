import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Clock, AlertTriangle } from 'lucide-react'
import { CabecalhoTela, CorpoTela, TituloSecao, ListaCartoes, LinhaLista, AreaToque, estiloCartao } from '../components/ui'
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

function Inicio({ abrirFinanceiro, dataVersion, ativa }) {
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

  const dataHoje = maiuscula(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

  // Atalhos para o Financeiro (já no filtro/mês correspondente).
  const primeiroDia = (mes) => `${chaveMes(mes)}-01`
  const abrir = (filtro, data) => () => abrirFinanceiro({ filtro, data })
  const abrirTudo = abrir('Todos', primeiroDia(mesAtual))
  const abrirVencidas = abrir('A receber', vencidas[0]?.vencimento.slice(0, 10) ?? primeiroDia(mesAtual))

  function circuloIcone(Icone, fundo, cor) {
    return (
      <span
        style={{ width: 36, height: 36, borderRadius: '50%', background: fundo, color: cor, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icone size={18} />
      </span>
    )
  }

  function renderContas(lista, vazio, cor, tag, prefixo) {
    if (lista.length === 0) return <p style={{ margin: 0, color: '#9aa0ad', textAlign: 'left' }}>{vazio}</p>
    return (
      <ListaCartoes>
        {lista.map((c) => (
          <LinhaLista
            key={c.id}
            cor={cor}
            nome={c.clientes?.nome || c.descricao}
            apoio={[c.clientes?.nome && c.descricao ? c.descricao : null, `${prefixo} ${formatarDataCurta(c.vencimento)}`]}
            direita={<div style={{ fontWeight: 600, color: 'var(--mjr-navy)' }}>{formatarReais(Number(c.valor))}</div>}
            etiqueta={tag}
            onClick={abrir('A receber', c.vencimento.slice(0, 10))}
          />
        ))}
      </ListaCartoes>
    )
  }

  if (loading) {
    return <div style={{ padding: 20, color: '#9aa0ad' }}>Carregando...</div>
  }

  const cartaoResumo = { ...estiloCartao, flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, paddingRight: 28 }
  const cartaoCompacto = { ...estiloCartao, textAlign: 'center', paddingBottom: 22 }

  const titulo = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <img
        src="/icon-192.png"
        alt=""
        width={46}
        height={46}
        style={{ width: 46, height: 46, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', display: 'block' }}
      />
      <span>
        MJR <span style={{ color: '#E03A2B' }}>Film</span>
      </span>
    </span>
  )

  return (
    <div style={{ paddingBottom: 'calc(var(--nav-bottom) + 100px)' }}>
      <CabecalhoTela titulo={titulo}>
        <p style={{ margin: '8px 0 0', color: '#d6d8de', fontSize: 12 }}>{dataHoje}</p>
        <div style={{ width: 48, height: 2, background: '#E03A2B', margin: '16px auto 0' }} />
      </CabecalhoTela>

      <CorpoTela style={{ paddingTop: 4 }}>
        <AreaToque
          onClick={abrirTudo}
          label="Abrir financeiro do mês"
          corChevron="#b9c8dc"
          style={{ background: '#14304d', border: '1px solid #2a4f7f', borderRadius: 16, padding: 14, paddingBottom: 26, marginBottom: 10, textAlign: 'left' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#b9c8dc' }}>Saldo do caixa · {maiuscula(nomeMes(mesAtual))}</div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); abrirTudo() }}
              style={{ color: '#7db2ff', fontSize: 13, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Ver financeiro
            </button>
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: saldo < 0 ? '#ff9b90' : '#FFFFFF', margin: '4px 0 14px' }}>
            {formatarReais(saldo)}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#b9c8dc' }}>
                <ArrowDownLeft size={14} color="#6fcf8a" /> Recebido
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#6fcf8a', marginTop: 2 }}>{formatarReais(recebido)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#b9c8dc' }}>
                <ArrowUpRight size={14} color="#ff9b90" /> Gastos
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#ff9b90', marginTop: 2 }}>{formatarReais(gastos)}</div>
            </div>
          </div>
        </AreaToque>

        <div style={{ display: 'flex', gap: 10 }}>
          <AreaToque onClick={abrir('A receber', primeiroDia(mesAtual))} label="Abrir contas a receber" style={cartaoResumo}>
            {circuloIcone(Clock, '#fdf1d6', '#9a6a00')}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#14304d' }}>{formatarReais(aReceber)}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>A receber</div>
            </div>
          </AreaToque>
          <AreaToque onClick={abrirVencidas} label="Abrir contas vencidas" style={cartaoResumo}>
            {circuloIcone(AlertTriangle, '#fbe4e2', '#C62E22')}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: vencidas.length > 0 ? '#C62E22' : '#14304d' }}>
                {vencidas.length} {vencidas.length === 1 ? 'vencida' : 'vencidas'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Em atraso</div>
            </div>
          </AreaToque>
        </div>

        <section>
          <TituloSecao onVer={abrirVencidas}>Vencidas</TituloSecao>
          {renderContas(vencidas, 'Nenhuma conta vencida.', 'var(--mjr-red)', { tom: 'vermelho', texto: 'Vencida' }, 'Venceu em')}
        </section>

        <section>
          <TituloSecao onVer={abrir('A receber', primeiroDia(mesAtual))}>Vence em breve</TituloSecao>
          {renderContas(venceEmBreve, `Nada vence nos próximos ${DIAS_VENCE_EM_BREVE} dias.`, '#6b7280', { tom: 'ambar', texto: 'A receber' }, 'Vence em')}
        </section>

        <section>
          <TituloSecao onVer={abrir('Todos', primeiroDia(mesAnterior))}>Mês anterior · {maiuscula(nomeMes(mesAnterior))}</TituloSecao>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <AreaToque onClick={abrir('Recebidos', primeiroDia(mesAnterior))} label="Abrir recebidos do mês anterior" style={cartaoCompacto}>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#1A7F46' }}>{formatarReais(recebidoAnterior)}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Recebido</div>
            </AreaToque>
            <AreaToque onClick={abrir('Gastos', primeiroDia(mesAnterior))} label="Abrir gastos do mês anterior" style={cartaoCompacto}>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#C62E22' }}>{formatarReais(gastosAnterior)}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Gastos</div>
            </AreaToque>
          </div>
        </section>
      </CorpoTela>
    </div>
  )
}

export default Inicio
