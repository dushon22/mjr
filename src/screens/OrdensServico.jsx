import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import { formatarDecimalDigitado, virgulaParaNumero } from '../utils/mascaras'

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

function OrdensServico({ osAlvo, limparOsAlvo }) {
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState('lista') // 'lista' | 'fechar' | 'detalhes'
  const [osAtual, setOsAtual] = useState(null)

  const [rolos, setRolos] = useState([])
  const [carregandoRolos, setCarregandoRolos] = useState(false)
  const [selecionados, setSelecionados] = useState({}) // { [rolo_id]: metros (string) }
  const [valorPago, setValorPago] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [fechando, setFechando] = useState(false)
  const [erroFechar, setErroFechar] = useState('')

  const [movimentacoes, setMovimentacoes] = useState([])
  const [carregandoMovs, setCarregandoMovs] = useState(false)

  async function carregarOrdens() {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*, agendamentos(*, clientes(nome), tipos_pelicula(nome))')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Erro ao buscar ordens de serviço:', error)
    } else {
      setOrdens(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarOrdens()
  }, [])

  useEffect(() => {
    if (!osAlvo || ordens.length === 0) return
    const os = ordens.find((o) => o.id === osAlvo.id)
    if (os) {
      if (osAlvo.modo === 'detalhes') {
        abrirDetalhes(os)
      } else {
        abrirFechar(os)
      }
    }
    limparOsAlvo?.()
  }, [osAlvo, ordens, limparOsAlvo])

  async function abrirFechar(os) {
    setOsAtual(os)
    setSelecionados({})
    setValorPago(os.agendamentos?.valor != null ? String(os.agendamentos.valor) : '')
    setFormaPagamento('')
    setErroFechar('')
    setView('fechar')
    setCarregandoRolos(true)
    const tipoId = os.agendamentos?.tipo_id
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .eq('tipo_id', tipoId)
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
      .select('*, estoque(identificacao)')
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

  function alternarRolo(roloId) {
    setSelecionados((prev) => {
      const proximo = { ...prev }
      if (roloId in proximo) {
        delete proximo[roloId]
      } else {
        proximo[roloId] = ''
      }
      return proximo
    })
  }

  function mudarMetros(roloId, valor) {
    setSelecionados((prev) => ({ ...prev, [roloId]: valor }))
  }

  async function confirmarFechamento() {
    setErroFechar('')
    const itens = Object.entries(selecionados).map(([rolo_id, metros]) => ({
      rolo_id,
      metros: Number(virgulaParaNumero(metros)),
    }))
    if (itens.length === 0) {
      setErroFechar('Selecione ao menos um rolo.')
      return
    }
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
    fontSize: 14,
    background: '#FFFFFF',
  }

  if (view === 'fechar' && osAtual) {
    const ag = osAtual.agendamentos
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        <header style={{ background: '#171717', padding: '24px 20px' }}>
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
          <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
            {ag?.clientes?.nome || 'Sem cliente'} · {ag?.tipos_pelicula?.nome || 'Tipo removido'}
            {ag?.veiculo_modelo ? ` · ${ag.veiculo_modelo}` : ''}
          </p>
        </header>

        <div
          style={{
            padding: '20px 20px calc(140px + env(safe-area-inset-bottom, 0px)) 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 13, color: '#8A8A8A' }}>
            Selecione um ou mais rolos do tipo <strong>{ag?.tipos_pelicula?.nome}</strong> e informe os metros usados de cada um.
          </div>

          {carregandoRolos && <div style={{ color: '#8A8A8A' }}>Carregando rolos...</div>}
          {!carregandoRolos && rolos.length === 0 && (
            <div style={{ color: '#A6332C' }}>Nenhum rolo com metragem disponível para este tipo de película.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rolos.map((rolo) => {
              const marcado = rolo.id in selecionados
              return (
                <div
                  key={rolo.id}
                  style={{
                    border: `1px solid ${marcado ? '#14304D' : '#E4E7EC'}`,
                    borderRadius: 12,
                    padding: 12,
                    background: marcado ? '#E4EAF1' : '#FFFFFF',
                  }}
                >
                  <div
                    onClick={() => alternarRolo(rolo.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{rolo.identificacao}</div>
                      <div style={{ fontSize: 13, color: '#8A8A8A' }}>
                        {rolo.largura_m ? `${rolo.largura_m} m largura · ` : ''}
                        {rolo.metragem_atual} m disponíveis
                      </div>
                    </div>
                    <input type="checkbox" checked={marcado} onChange={() => alternarRolo(rolo.id)} style={{ width: 20, height: 20 }} />
                  </div>
                  {marcado && (
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="Metros usados (ex: 1,52)"
                      value={selecionados[rolo.id]}
                      onChange={(e) => mudarMetros(rolo.id, formatarDecimalDigitado(e.target.value))}
                      style={{ ...campo, marginTop: 10 }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4A4A4A' }}>
            Valor pago
            <CampoMoeda value={valorPago} onChange={setValorPago} required style={campo} />
            {ag?.valor != null && valorPago !== '' && Number(valorPago) !== Number(ag.valor) && (
              <span style={{ fontSize: 13, fontWeight: 600, color: Number(valorPago) < Number(ag.valor) ? '#A6332C' : '#4C7A4E' }}>
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
            <div style={{ color: '#A6332C', fontSize: 13, fontWeight: 600 }}>{erroFechar}</div>
          )}

          <button
            type="button"
            onClick={confirmarFechamento}
            disabled={fechando}
            style={{
              padding: 12,
              borderRadius: 10,
              border: 'none',
              background: '#14304D',
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
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        <header style={{ background: '#171717', padding: '24px 20px' }}>
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
          <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
            {ag?.clientes?.nome || 'Sem cliente'} · {ag?.tipos_pelicula?.nome || 'Tipo removido'}
            {ag?.veiculo_modelo ? ` · ${ag.veiculo_modelo}` : ''}
          </p>
        </header>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#8A8A8A' }}>
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
                  <span style={{ fontSize: 13, color: '#8A8A8A' }}>Valor combinado</span>
                  <span style={{ fontWeight: 600 }}>{formatarValor(ag.valor)}</span>
                </div>
              )}
              {(osAtual.valor_pago != null || ag?.valor != null) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#8A8A8A' }}>Valor pago</span>
                  <span style={{ fontWeight: 700 }}>{formatarValor(osAtual.valor_pago ?? ag.valor)}</span>
                </div>
              )}
              {osAtual.forma_pagamento && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#8A8A8A' }}>Forma de pagamento</span>
                  <span style={{ fontWeight: 600 }}>{osAtual.forma_pagamento}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Rolos utilizados
            </div>
            {carregandoMovs && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
            {!carregandoMovs && movimentacoes.length === 0 && (
              <div style={{ color: '#8A8A8A' }}>Nenhuma movimentação registrada.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {movimentacoes.map((mov) => (
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
          </div>
        </div>
      </div>
    )
  }

  const secoes = [
    { titulo: 'Em aberto', ordens: ordens.filter((o) => o.status === 'aberta') },
    { titulo: 'Fechadas', ordens: ordens.filter((o) => o.status !== 'aberta') },
  ]

  return (
    <div style={{ paddingBottom: 'calc(106px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: '#171717', padding: '24px 20px' }}>
        <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
          Ordens de serviço
        </h1>
        <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
          {secoes[0].ordens.length} abertas · {secoes[1].ordens.length} fechadas
        </p>
      </header>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
        {!loading && ordens.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhuma OS gerada ainda.</div>
        )}
        {!loading && ordens.length > 0 && secoes.map((secao) => (
          <section key={secao.titulo}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              {secao.titulo}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {secao.ordens.length === 0 && (
                <div style={{ fontSize: 13, color: '#8A8A8A' }}>Nenhuma OS.</div>
              )}
              {secao.ordens.map((os) => {
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
                    <div style={{ width: 4, background: aberta ? '#14304D' : '#8A8A8A' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{ag?.clientes?.nome || 'Sem cliente'}</span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: aberta ? '#E4EAF1' : '#E9F3E9',
                            color: aberta ? '#14304D' : '#4C7A4E',
                          }}
                        >
                          {aberta ? 'Aberta' : 'Fechada'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#8A8A8A', textAlign: 'left' }}>
                        {ag?.tipos_pelicula?.nome || 'Tipo removido'} · {ag?.servico}
                        {ag?.veiculo_modelo ? ` · ${ag.veiculo_modelo}` : ''}
                      </div>
                      <div style={{ fontSize: 13, color: '#8A8A8A', textAlign: 'left' }}>
                        {formatarData(ag?.data)} {ag?.hora?.slice(0, 5)}
                      </div>
                      {ag?.valor != null && (
                        <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                          {formatarValor(ag.valor)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default OrdensServico
