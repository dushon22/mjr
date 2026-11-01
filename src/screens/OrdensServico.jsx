import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import { formatarDecimalDigitado, virgulaParaNumero } from '../utils/mascaras'
import StatusTag from '../components/StatusTag'
import BotaoFlutuante from '../components/BotaoFlutuante'
import FormAgendamento from '../components/FormAgendamento'
import { mesAtualSP, limitesDoMes, rotuloMes, dataLocalSP } from '../utils/periodo'

function formatarData(data) {
  if (!data) return ''
  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarDataHora(valor) {
  if (!valor) return ''
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarValor(valor) {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência']

const POR_PAGINA = 20
const CAMPOS_OS = 'clientes(nome, observacao), tipos_pelicula(nome), agendamento_itens(*, servicos(nome, unidade), tipos_pelicula(nome))'
const SELECT_OS = `*, agendamentos(*, ${CAMPOS_OS})`
const SELECT_OS_BUSCA = `*, agendamentos!inner(*, ${CAMPOS_OS})`

function valorDaOs(os) {
  return os.valor_pago ?? os.agendamentos?.valor
}

// Itens com a película efetiva: itens antigos sem película usam a do agendamento.
// Agendamentos antigos sem itens viram um único item com o serviço e a película do agendamento.
function itensComPelicula(ag) {
  const itens = ag?.agendamento_itens ?? []
  if (itens.length === 0) {
    return [{
      id: 'agendamento',
      servicoNome: ag?.servico || 'Serviço',
      tipoId: ag?.tipo_id ?? null,
      tipoNome: ag?.tipos_pelicula?.nome || 'Tipo removido',
      valor: ag?.valor,
    }]
  }
  return itens.map((item) => ({
    id: item.id,
    servicoNome: (item.servicos?.nome || 'Serviço removido') + (item.servicos?.unidade === 'm2' ? ` (${item.quantidade} m²)` : ''),
    tipoId: item.tipo_pelicula_id ?? ag?.tipo_id ?? null,
    tipoNome: (item.tipo_pelicula_id ? item.tipos_pelicula?.nome : ag?.tipos_pelicula?.nome) || 'Tipo removido',
    valor: item.valor,
  }))
}

function CabecalhoOS({ ag }) {
  const peliculas = [...new Set(itensComPelicula(ag).map((item) => item.tipoNome))].join(' + ')
  return (
    <>
      <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
        {ag?.clientes?.nome || 'Sem cliente'}
        {ag?.veiculo_modelo ? ` · ${ag.veiculo_modelo}` : ''}
      </p>
      <p style={{ margin: '2px 0 0', color: '#CFCFCF', fontSize: 13 }}>{peliculas}</p>
    </>
  )
}

function ItensEObservacao({ ag }) {
  const itens = ag?.agendamento_itens?.length ? itensComPelicula(ag) : []
  const observacaoAgendamento = ag?.observacao
  const observacaoCliente = ag?.clientes?.observacao
  if (itens.length === 0 && !observacaoAgendamento && !observacaoCliente) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {itens.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Itens
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itens.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: 12, padding: 12 }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.servicoNome}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{item.tipoNome}</div>
                </div>
                <span>{formatarValor(item.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {(observacaoAgendamento || observacaoCliente) && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Observação
          </div>
          {observacaoAgendamento && (
            <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>{observacaoAgendamento}</p>
          )}
          {observacaoCliente && (
            <p style={{ margin: observacaoAgendamento ? '8px 0 0' : 0, fontSize: 13, color: '#6b7280', whiteSpace: 'pre-wrap' }}>
              {observacaoCliente}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function OrdensServico({ osAlvo, limparOsAlvo, dataVersion, ativa }) {
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState('lista') // 'lista' | 'fechar' | 'detalhes' | 'nova'
  const [osAtual, setOsAtual] = useState(null)

  const [rolos, setRolos] = useState([])
  const [carregandoRolos, setCarregandoRolos] = useState(false)
  const [selecionados, setSelecionados] = useState({}) // { [item_id]: { [rolo_id]: metros (string) } }
  const [valorPago, setValorPago] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [fechando, setFechando] = useState(false)
  const [erroFechar, setErroFechar] = useState('')

  const [movimentacoes, setMovimentacoes] = useState([])
  const [carregandoMovs, setCarregandoMovs] = useState(false)

  const [totalFechadas, setTotalFechadas] = useState(0)
  const [mesRef, setMesRef] = useState(mesAtualSP)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [limite, setLimite] = useState(POR_PAGINA)
  const [fechadas, setFechadas] = useState([])
  const [totalLista, setTotalLista] = useState(0)
  const [somaMes, setSomaMes] = useState(0)
  const [carregandoFechadas, setCarregandoFechadas] = useState(true)
  const [ultimoMes, setUltimoMes] = useState(null) // mês da OS fechada mais recente
  const abriuNoUltimoMes = useRef(false)

  async function carregarOrdens() {
    const [abertas, fechadasCount] = await Promise.all([
      supabase
        .from('ordens_servico')
        .select(SELECT_OS)
        .eq('status', 'aberta')
        .order('created_at', { ascending: false }),
      supabase.from('ordens_servico').select('id', { count: 'exact', head: true }).neq('status', 'aberta'),
    ])
    if (abertas.error) {
      console.error('Erro ao buscar ordens de serviço:', abertas.error)
    } else {
      setOrdens(abertas.data ?? [])
    }
    setTotalFechadas(fechadasCount.count ?? 0)
    setLoading(false)
  }

  async function carregarFechadas() {
    const termo = buscaAplicada.replace(/[,()%*\\]/g, ' ').trim()
    let lista
    let total
    let soma = 0
    if (termo) {
      const { data: clientesBusca } = await supabase.from('clientes').select('id').ilike('nome', `%${termo}%`).limit(500)
      const ids = (clientesBusca ?? []).map((c) => c.id)
      const filtro = [`veiculo_modelo.ilike.%${termo}%`, ids.length ? `cliente_id.in.(${ids.join(',')})` : null].filter(Boolean).join(',')
      const res = await supabase
        .from('ordens_servico')
        .select(SELECT_OS_BUSCA, { count: 'exact' })
        .neq('status', 'aberta')
        .or(filtro, { referencedTable: 'agendamentos' })
        .order('fechada_em', { ascending: false })
        .range(0, limite - 1)
      if (res.error) console.error('Erro ao buscar OS fechadas:', res.error)
      lista = res.data ?? []
      total = res.count ?? lista.length
    } else {
      const { inicio, fim } = limitesDoMes(mesRef)
      const base = (colunas, opcoes) => supabase
        .from('ordens_servico')
        .select(colunas, opcoes)
        .neq('status', 'aberta')
        .gte('fechada_em', inicio)
        .lt('fechada_em', fim)
      const [res, resumo] = await Promise.all([
        base(SELECT_OS).order('fechada_em', { ascending: false }).range(0, limite - 1),
        base('valor_pago, agendamentos(valor)', { count: 'exact' }),
      ])
      if (res.error) console.error('Erro ao buscar OS fechadas:', res.error)
      lista = res.data ?? []
      total = resumo.count ?? lista.length
      soma = (resumo.data ?? []).reduce((s, o) => s + Number(valorDaOs(o) ?? 0), 0)
    }
    setFechadas(lista)
    setTotalLista(total)
    setSomaMes(soma)
    setCarregandoFechadas(false)
  }

  useEffect(() => {
    if (ativa) carregarOrdens()
  }, [dataVersion, ativa])

  useEffect(() => {
    if (!ativa) return
    supabase
      .from('ordens_servico')
      .select('fechada_em')
      .neq('status', 'aberta')
      .not('fechada_em', 'is', null)
      .order('fechada_em', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const iso = dataLocalSP(data?.[0]?.fechada_em)
        const mes = iso ? { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) } : null
        setUltimoMes(mes)
        if (abriuNoUltimoMes.current) return
        abriuNoUltimoMes.current = true
        const atual = mesAtualSP()
        if (mes && (mes.ano !== atual.ano || mes.mes !== atual.mes)) setMesRef(mes)
      })
  }, [dataVersion, ativa])

  useEffect(() => {
    if (ativa) carregarFechadas()
  }, [dataVersion, ativa, mesRef, buscaAplicada, limite])

  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaAplicada(busca.trim())
      setLimite(POR_PAGINA)
    }, 300)
    return () => clearTimeout(t)
  }, [busca])

  function mudarMes(delta) {
    setMesRef(({ ano, mes }) => {
      const d = new Date(ano, mes - 1 + delta, 1)
      return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
    })
    setLimite(POR_PAGINA)
  }

  useEffect(() => {
    if (!osAlvo) return
    const alvo = osAlvo
    async function abrirAlvo() {
      let os = ordens.find((o) => o.id === alvo.id)
      if (alvo.modo === 'detalhes') {
        // Fechadas não ficam na lista em memória.
        if (!os) {
          const { data } = await supabase.from('ordens_servico').select(SELECT_OS).eq('id', alvo.id).maybeSingle()
          os = data
        }
        if (os) abrirDetalhes(os)
      } else {
        if (ordens.length === 0) return
        if (os) abrirFechar(os)
      }
      limparOsAlvo?.()
    }
    abrirAlvo()
  }, [osAlvo, ordens, limparOsAlvo])

  async function abrirFechar(os) {
    setOsAtual(os)
    setSelecionados({})
    setValorPago(os.agendamentos?.valor != null ? String(os.agendamentos.valor) : '')
    setFormaPagamento('')
    setErroFechar('')
    setView('fechar')
    setCarregandoRolos(true)
    const tipoIds = [...new Set(itensComPelicula(os.agendamentos).map((item) => item.tipoId).filter(Boolean))]
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .in('tipo_id', tipoIds)
      .gt('metragem_atual', 0)
      .order('identificacao', { ascending: true })
    if (error) {
      console.error('Erro ao buscar rolos disponíveis:', error)
    } else {
      setRolos(data ?? [])
    }
    setCarregandoRolos(false)
  }

  async function abrirDetalhes(os) {
    setOsAtual(os)
    setView('detalhes')
    setCarregandoMovs(true)
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select('*, estoque(identificacao, tipo_id)')
      .eq('os_id', os.id)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Erro ao buscar movimentações da OS:', error)
    } else {
      setMovimentacoes(data ?? [])
    }
    setCarregandoMovs(false)
  }

  function fecharView() {
    setView('lista')
    setOsAtual(null)
    setRolos([])
    setSelecionados({})
    setValorPago('')
    setFormaPagamento('')
    setErroFechar('')
    setMovimentacoes([])
  }

  // Abre uma OS direto, sem agendamento prévio: o formulário cria o agendamento (agora) e aqui garantimos a OS aberta.
  async function aoAbrirOs(agendamentoId) {
    const { data: existente } = await supabase.from('ordens_servico').select('id').eq('agendamento_id', agendamentoId).maybeSingle()
    if (!existente) {
      const { error } = await supabase.from('ordens_servico').insert({ agendamento_id: agendamentoId, status: 'aberta' })
      if (error) {
        console.error('Erro ao abrir OS:', error)
        alert('O agendamento foi salvo, mas não foi possível abrir a OS. Tente novamente.')
        return
      }
    }
    setView('lista')
    await carregarOrdens()
  }

  function alternarRolo(itemId, roloId) {
    setSelecionados((prev) => {
      const doItem = { ...(prev[itemId] ?? {}) }
      if (roloId in doItem) {
        delete doItem[roloId]
      } else {
        doItem[roloId] = ''
      }
      return { ...prev, [itemId]: doItem }
    })
  }

  function mudarMetros(itemId, roloId, valor) {
    setSelecionados((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? {}), [roloId]: valor } }))
  }

  async function confirmarFechamento() {
    setErroFechar('')
    const itensOs = itensComPelicula(osAtual.agendamentos)
    if (itensOs.some((item) => Object.keys(selecionados[item.id] ?? {}).length === 0)) {
      setErroFechar('Selecione ao menos um rolo para cada item.')
      return
    }
    // Baixa normal por rolo: uma entrada para cada rolo selecionado em cada item.
    const itens = itensOs.flatMap((item) => Object.entries(selecionados[item.id]).map(([rolo_id, metros]) => ({
      rolo_id,
      metros: Number(virgulaParaNumero(metros)),
    })))
    if (itens.some((item) => !item.metros || item.metros <= 0)) {
      setErroFechar('Informe os metros de cada rolo selecionado.')
      return
    }
    if (!valorPago || Number(valorPago) <= 0) {
      setErroFechar('Informe o valor pago.')
      return
    }
    if (!formaPagamento) {
      setErroFechar('Selecione a forma de pagamento.')
      return
    }
    if (!window.confirm('Fechar esta OS com os rolos selecionados?')) return
    setFechando(true)
    const { error } = await supabase.rpc('fechar_os', {
      p_os_id: osAtual.id,
      p_itens: itens,
      p_valor_pago: Number(valorPago),
      p_forma_pagamento: formaPagamento,
    })
    setFechando(false)
    if (error) {
      console.error('Erro ao fechar OS:', error)
      setErroFechar(error.message)
      return
    }
    fecharView()
    await carregarOrdens()
  }

  const campo = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    borderRadius: 10,
    border: '1px solid #E4E7EC',
    fontSize: 16,
    background: '#FFFFFF',
  }

  if (view === 'nova') {
    return (
      <FormAgendamento
        modoOS
        titulo="Abrir OS"
        rotuloSalvar="Abrir OS"
        onSalvo={aoAbrirOs}
        onCancelar={() => setView('lista')}
      />
    )
  }

  if (view === 'fechar' && osAtual) {
    const ag = osAtual.agendamentos
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF', paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <button
            type="button"
            onClick={fecharView}
            style={{ background: 'none', border: 'none', color: '#CFCFCF', fontSize: 13, padding: 0, marginBottom: 10, cursor: 'pointer' }}
          >
            ‹ Voltar
          </button>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            Fechar OS
          </h1>
          <CabecalhoOS ag={ag} />
        </header>

        <div
          style={{
            padding: '20px 20px calc(var(--nav-bottom) + 100px) 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <ItensEObservacao ag={ag} />

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Rolos utilizados
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Para cada item, selecione um ou mais rolos da película do item e informe os metros usados de cada um.
            </div>
            {carregandoRolos && <div style={{ color: '#9aa0ad' }}>Carregando rolos...</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!carregandoRolos && itensComPelicula(ag).map((item) => {
                const rolosDoItem = rolos.filter((rolo) => rolo.tipo_id === item.tipoId)
                const selecionadosDoItem = selecionados[item.id] ?? {}
                return (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600 }}>
                      {item.servicoNome} · <span style={{ color: '#6b7280' }}>{item.tipoNome}</span>
                    </div>
                    {rolosDoItem.length === 0 && (
                      <div style={{ color: '#a32d2d', fontSize: 13 }}>Nenhum rolo com metragem disponível para este tipo de película.</div>
                    )}
                    {rolosDoItem.map((rolo) => {
                      const marcado = rolo.id in selecionadosDoItem
                      return (
                        <div
                          key={rolo.id}
                          style={{
                            border: `1px solid ${marcado ? 'var(--mjr-navy)' : '#E4E7EC'}`,
                            borderRadius: 12,
                            padding: 12,
                            background: marcado ? '#E4EAF1' : '#FFFFFF',
                          }}
                        >
                          <div
                            onClick={() => alternarRolo(item.id, rolo.id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{rolo.identificacao}</div>
                              <div style={{ fontSize: 13, color: '#6b7280' }}>
                                {rolo.largura_m ? `${rolo.largura_m} m largura · ` : ''}
                                {rolo.metragem_atual} m disponíveis
                              </div>
                            </div>
                            <input type="checkbox" checked={marcado} onChange={() => alternarRolo(item.id, rolo.id)} style={{ width: 20, height: 20 }} />
                          </div>
                          {marcado && (
                            <input
                              type="text"
                              inputMode="decimal"
                              required
                              placeholder="Metros usados (ex: 1,52)"
                              value={selecionadosDoItem[rolo.id]}
                              onChange={(e) => mudarMetros(item.id, rolo.id, formatarDecimalDigitado(e.target.value))}
                              style={{ ...campo, marginTop: 10 }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4A4A4A' }}>
            Valor pago
            <CampoMoeda value={valorPago} onChange={setValorPago} required style={campo} />
            {ag?.valor != null && valorPago !== '' && Number(valorPago) !== Number(ag.valor) && (
              <span style={{ fontSize: 13, fontWeight: 600, color: Number(valorPago) < Number(ag.valor) ? '#a32d2d' : '#4C7A4E' }}>
                {Number(valorPago) < Number(ag.valor)
                  ? `Desconto de ${formatarValor(Number(ag.valor) - Number(valorPago))}`
                  : `Acréscimo de ${formatarValor(Number(valorPago) - Number(ag.valor))}`}
              </span>
            )}
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4A4A4A' }}>
            Forma de pagamento
            <select
              required
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              style={campo}
            >
              <option value="" disabled>Selecione</option>
              {FORMAS_PAGAMENTO.map((forma) => (
                <option key={forma} value={forma}>{forma}</option>
              ))}
            </select>
          </label>

          {erroFechar && (
            <div style={{ color: '#a32d2d', fontSize: 13, fontWeight: 600 }}>{erroFechar}</div>
          )}

          <button
            type="button"
            onClick={confirmarFechamento}
            disabled={fechando}
            style={{
              padding: 12,
              borderRadius: 10,
              border: 'none',
              background: 'var(--mjr-navy)',
              color: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: fechando ? 0.6 : 1,
            }}
          >
            {fechando ? 'Fechando...' : 'Fechar OS'}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'detalhes' && osAtual) {
    const ag = osAtual.agendamentos
    // As movimentações não guardam o item; cada rolo aparece junto dos itens da película dele.
    const itensOs = itensComPelicula(ag)
    const tiposOs = [...new Set(itensOs.map((item) => item.tipoId))]
    const gruposDeRolos = tiposOs.map((tipoId) => {
      const itensDoTipo = itensOs.filter((item) => item.tipoId === tipoId)
      return {
        chave: tipoId ?? 'sem-tipo',
        titulo: itensDoTipo.map((item) => item.servicoNome).join(' + '),
        subtitulo: itensDoTipo[0].tipoNome,
        movs: movimentacoes.filter((mov) => mov.estoque?.tipo_id === tipoId),
      }
    })
    const movsSemGrupo = movimentacoes.filter((mov) => !tiposOs.includes(mov.estoque?.tipo_id))
    if (movsSemGrupo.length > 0) {
      gruposDeRolos.push({ chave: 'outros', titulo: 'Outros rolos', subtitulo: '', movs: movsSemGrupo })
    }
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF', paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <button
            type="button"
            onClick={fecharView}
            style={{ background: 'none', border: 'none', color: '#CFCFCF', fontSize: 13, padding: 0, marginBottom: 10, cursor: 'pointer' }}
          >
            ‹ Voltar
          </button>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            OS fechada
          </h1>
          <CabecalhoOS ag={ag} />
        </header>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Fechada em {formatarDataHora(osAtual.fechada_em)}
          </div>

          {(ag?.valor != null || osAtual.valor_pago != null || osAtual.forma_pagamento) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: '#FFFFFF',
                border: '1px solid #E4E7EC',
                borderRadius: 12,
                padding: 12,
              }}
            >
              {ag?.valor != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Valor combinado</span>
                  <span style={{ fontWeight: 600 }}>{formatarValor(ag.valor)}</span>
                </div>
              )}
              {(osAtual.valor_pago != null || ag?.valor != null) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Valor pago</span>
                  <span style={{ fontWeight: 700 }}>{formatarValor(osAtual.valor_pago ?? ag.valor)}</span>
                </div>
              )}
              {osAtual.forma_pagamento && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Forma de pagamento</span>
                  <span style={{ fontWeight: 600 }}>{osAtual.forma_pagamento}</span>
                </div>
              )}
            </div>
          )}

          <ItensEObservacao ag={ag} />

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Rolos utilizados
            </div>
            {carregandoMovs && <div style={{ color: '#9aa0ad' }}>Carregando...</div>}
            {!carregandoMovs && movimentacoes.length === 0 && (
              <div style={{ color: '#9aa0ad' }}>Nenhuma movimentação registrada.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!carregandoMovs && movimentacoes.length > 0 && gruposDeRolos.map((grupo) => (
                <div key={grupo.chave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontWeight: 600 }}>
                    {grupo.titulo}
                    {grupo.subtitulo && <span style={{ color: '#6b7280' }}> · {grupo.subtitulo}</span>}
                  </div>
                  {grupo.movs.length === 0 && (
                    <div style={{ color: '#9aa0ad', fontSize: 13 }}>Nenhum rolo registrado.</div>
                  )}
                  {grupo.movs.map((mov) => (
                    <div
                      key={mov.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        border: '1px solid #E4E7EC',
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{mov.estoque?.identificacao || 'Rolo removido'}</span>
                      <span>{mov.metros} m</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const abertas = ordens
  const emBusca = buscaAplicada !== ''
  const atual = mesAtualSP()
  const noMesAtual = mesRef.ano === atual.ano && mesRef.mes === atual.mes
  const restantes = Math.max(0, totalLista - fechadas.length)

  function cartaoOs(os) {
    const ag = os.agendamentos
    const aberta = os.status === 'aberta'
    return (
      <div
        key={os.id}
        onClick={() => (aberta ? abrirFechar(os) : abrirDetalhes(os))}
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
        <div style={{ width: 4, background: aberta ? 'var(--mjr-navy)' : '#6b7280' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#14202e' }}>{ag?.clientes?.nome || 'Sem cliente'}</span>
            <StatusTag tom={aberta ? 'azul' : 'verde'}>{aberta ? 'Aberta' : 'Fechada'}</StatusTag>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'left' }}>
            {ag?.tipos_pelicula?.nome || 'Tipo removido'} · {ag?.servico}
            {ag?.veiculo_modelo ? ` · ${ag.veiculo_modelo}` : ''}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#6b7280', textAlign: 'left' }}>
              {formatarData(ag?.data)} {ag?.hora?.slice(0, 5)}
            </span>
            {(aberta ? ag?.valor : os.valor_pago ?? ag?.valor) != null && (
              <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--mjr-navy)' }}>
                {formatarValor(aberta ? ag.valor : os.valor_pago ?? ag.valor)}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const tituloSecao = { fontSize: 12, fontWeight: 700, color: '#9aa0ad', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }
  const setaMes = { background: 'none', border: 'none', color: '#CFCFCF', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: '0 8px' }

  return (
    <div style={{ paddingBottom: 'calc(var(--nav-bottom) + 100px)' }}>
      <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
          Ordens de serviço
        </h1>
        <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
          {abertas.length} em aberto · {totalFechadas} fechadas no total
        </p>
      </header>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading && <div style={{ color: '#9aa0ad' }}>Carregando...</div>}
        {!loading && abertas.length === 0 && totalFechadas === 0 && (
          <div style={{ color: '#9aa0ad' }}>Nenhuma OS gerada ainda.</div>
        )}
        {!loading && (abertas.length > 0 || totalFechadas > 0) && (
          <>
            <section>
              <div style={tituloSecao}>Em aberto</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {abertas.length === 0 && <div style={{ fontSize: 13, color: '#9aa0ad' }}>Nenhuma OS.</div>}
                {abertas.map(cartaoOs)}
              </div>
            </section>

            <section>
              <div style={tituloSecao}>Fechadas</div>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente ou veículo"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#2a2c33',
                  color: '#f2f3f5',
                  fontSize: 16,
                  marginBottom: 12,
                }}
              />
              {!emBusca && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" style={setaMes}>‹</button>
                    <div style={{ color: '#f2f3f5', fontWeight: 600, fontSize: 14 }}>{rotuloMes(mesRef)}</div>
                    <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" disabled={noMesAtual} style={{ ...setaMes, opacity: noMesAtual ? 0.3 : 1, cursor: noMesAtual ? 'default' : 'pointer' }}>›</button>
                  </div>
                  <div style={{ textAlign: 'center', color: '#9aa0ad', fontSize: 13, marginTop: 4 }}>
                    {totalLista} OS · {formatarValor(somaMes)}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!carregandoFechadas && fechadas.length === 0 && (
                  emBusca || !ultimoMes ? (
                    <div style={{ fontSize: 13, color: '#9aa0ad' }}>Nenhuma OS.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 13, color: '#9aa0ad' }}>Nenhuma OS fechada em {rotuloMes(mesRef)}.</div>
                      {(ultimoMes.ano !== mesRef.ano || ultimoMes.mes !== mesRef.mes) && (
                        <button
                          type="button"
                          onClick={() => { setMesRef(ultimoMes); setLimite(POR_PAGINA) }}
                          style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#f2f3f5', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Ver {rotuloMes(ultimoMes)}
                        </button>
                      )}
                    </div>
                  )
                )}
                {fechadas.map(cartaoOs)}
                {restantes > 0 && (
                  <button
                    type="button"
                    onClick={() => setLimite((l) => l + POR_PAGINA)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.35)',
                      background: 'transparent',
                      color: '#f2f3f5',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Ver mais {Math.min(POR_PAGINA, restantes)} OS
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <BotaoFlutuante ativa={ativa} onClick={() => setView('nova')}>
        +
      </BotaoFlutuante>
    </div>
  )
}

export default OrdensServico
