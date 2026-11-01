import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import { formatarDecimalDigitado, virgulaParaNumero } from '../utils/mascaras'
import BotaoFlutuante from '../components/BotaoFlutuante'

const LIMITE_ALERTA_M = 5

const formatarM = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function Estoque({ setActiveTab, dataVersion, ativa }) {
  const [itens, setItens] = useState([])
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [tipoId, setTipoId] = useState('')
  const [novoTipoAtivo, setNovoTipoAtivo] = useState(false)
  const [novoTipoMaterial, setNovoTipoMaterial] = useState('')
  const [novoTipoColoracao, setNovoTipoColoracao] = useState('')
  const [novoTipoMarca, setNovoTipoMarca] = useState('')
  const [criandoTipo, setCriandoTipo] = useState(false)
  const [identificacao, setIdentificacao] = useState('')
  const [larguraM, setLarguraM] = useState('1,52')
  const [metragemInicial, setMetragemInicial] = useState('30,00')
  const [custo, setCusto] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [itemEditando, setItemEditando] = useState(null)

  function limparCampos() {
    setTipoId('')
    setNovoTipoAtivo(false)
    setNovoTipoMaterial('')
    setNovoTipoColoracao('')
    setNovoTipoMarca('')
    setIdentificacao('')
    setLarguraM('1,52')
    setMetragemInicial('30,00')
    setCusto('')
  }

  function abrirEdicao(item) {
    setItemEditando(item)
    setTipoId(item.tipo_id ?? '')
    setNovoTipoAtivo(false)
    setNovoTipoMaterial('')
    setNovoTipoColoracao('')
    setNovoTipoMarca('')
    setIdentificacao(item.identificacao ?? '')
    setLarguraM(item.largura_m != null ? String(item.largura_m).replace('.', ',') : '')
    setMetragemInicial(item.metragem_inicial != null ? String(item.metragem_inicial).replace('.', ',') : '')
    setCusto(String(item.custo ?? ''))
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setItemEditando(null)
    limparCampos()
  }

  function abrirCadastroTipo() {
    setNovoTipoMaterial('')
    setNovoTipoColoracao('')
    setNovoTipoMarca('')
    setNovoTipoAtivo(true)
  }

  function cancelarNovoTipo() {
    setNovoTipoAtivo(false)
    setNovoTipoMaterial('')
    setNovoTipoColoracao('')
    setNovoTipoMarca('')
  }

  async function salvarNovoTipo() {
    const materialNovo = novoTipoMaterial.trim()
    if (!materialNovo) {
      alert('Informe o material do tipo de película.')
      return
    }
    const coloracaoNovo = novoTipoColoracao.trim()
    const nomeNovo = coloracaoNovo ? `${materialNovo} ${coloracaoNovo}` : materialNovo
    setCriandoTipo(true)
    const { data: tipoCriado, error } = await supabase
      .from('tipos_pelicula')
      .insert({
        nome: nomeNovo,
        material: materialNovo,
        coloracao: coloracaoNovo || null,
        marca: novoTipoMarca || null,
        ativo: true,
      })
      .select('*')
      .single()
    setCriandoTipo(false)
    if (error) {
      console.error('Erro ao cadastrar tipo de película:', error)
      alert('Não foi possível cadastrar o tipo de película. Tente novamente.')
      return
    }
    setTipos((atual) => [...atual, tipoCriado].sort((a, b) => a.nome.localeCompare(b.nome)))
    setTipoId(tipoCriado.id)
    setNovoTipoAtivo(false)
    setNovoTipoMaterial('')
    setNovoTipoColoracao('')
    setNovoTipoMarca('')
  }

  async function carregarItens() {
    const { data, error } = await supabase
      .from('estoque')
      .select('*, tipos_pelicula(nome, ativo)')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Erro ao buscar estoque:', error)
    } else {
      setItens((data ?? []).filter((i) => i.tipos_pelicula?.ativo !== false))
    }
    setLoading(false)
  }

  async function carregarTipos() {
    const { data, error } = await supabase
      .from('tipos_pelicula')
      .select('*')
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao buscar tipos de película:', error)
    } else {
      setTipos(data ?? [])
    }
  }

  useEffect(() => {
    if (!ativa) return
    carregarItens()
    carregarTipos()
  }, [dataVersion, ativa])

  async function salvar(e) {
    e.preventDefault()
    if (itemEditando && !window.confirm('Salvar alterações deste rolo?')) return
    setSalvando(true)
    const tipoEscolhido = tipos.find((t) => t.id === tipoId)
    const nome = tipoEscolhido ? `${tipoEscolhido.nome} - ${identificacao}` : identificacao
    const metragemInicialNum = Number(virgulaParaNumero(metragemInicial))
    const dados = {
      tipo_id: tipoId,
      nome,
      identificacao,
      largura_m: Number(virgulaParaNumero(larguraM)),
      metragem_inicial: metragemInicialNum,
      custo: custo === '' ? null : Number(custo),
    }
    const { error } = itemEditando
      ? await supabase.from('estoque').update(dados).eq('id', itemEditando.id)
      : await supabase.from('estoque').insert({ ...dados, metragem_atual: metragemInicialNum })
    setSalvando(false)
    if (error) {
      console.error('Erro ao salvar rolo:', error)
      alert('Não foi possível salvar o rolo. Tente novamente.')
      return
    }
    fecharForm()
    await carregarItens()
  }

  async function excluir() {
    if (!window.confirm(`Excluir o rolo ${itemEditando.identificacao}?`)) return
    setSalvando(true)
    const { error } = await supabase.from('estoque').delete().eq('id', itemEditando.id)
    setSalvando(false)
    if (error) {
      console.error('Erro ao excluir rolo:', error)
      alert('Não foi possível excluir o rolo. Tente novamente.')
      return
    }
    fecharForm()
    await carregarItens()
  }

  const tiposComTotal = tipos
    .map((tipo) => ({
      ...tipo,
      total: itens
        .filter((i) => i.tipo_id === tipo.id)
        .reduce((soma, i) => soma + Number(i.metragem_atual ?? 0), 0),
    }))
    .filter((tipo) => itens.some((i) => i.tipo_id === tipo.id))

  if (mostrarForm) {
    const campo = {
      width: '100%',
      boxSizing: 'border-box',
      height: 42,
      padding: '0 12px',
      borderRadius: 12,
      border: '1px solid #dfe3ea',
      fontSize: 16,
      color: '#14202e',
      background: '#FFFFFF',
    }
    const rotulo = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#6b7280', textAlign: 'left' }
    const cartao = { background: '#FFFFFF', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
    const tituloCartao = { fontSize: 16, fontWeight: 500, color: '#14202e', textAlign: 'left' }
    const sufixo = { position: 'absolute', right: 12, top: 0, height: 42, display: 'flex', alignItems: 'center', fontSize: 16, color: '#6b7280', pointerEvents: 'none' }
    const tiposSelecionaveis = tipos.filter((t) => t.ativo || t.id === itemEditando?.tipo_id)
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--mjr-bg)' }}>
        <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {itemEditando ? 'Editar rolo' : 'Novo rolo'}
          </h1>
        </header>
        <form
          onSubmit={salvar}
          style={{
            padding: '8px 20px calc(var(--nav-bottom) + 100px) 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={cartao}>
            <div style={tituloCartao}>Película</div>
            <div style={rotulo}>
              <span>Tipo de película</span>
              <select
                required
                value={tipoId}
                onChange={(e) => {
                  const valor = e.target.value
                  if (valor === '__novo__') {
                    abrirCadastroTipo()
                    return
                  }
                  setTipoId(valor)
                }}
                style={campo}
              >
                <option value="" disabled>
                  {tiposSelecionaveis.length ? 'Selecione um tipo' : 'Nenhum tipo cadastrado'}
                </option>
                {tiposSelecionaveis.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
                <option value="__novo__">+ Novo tipo</option>
              </select>
            {novoTipoAtivo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: '#f6f7f9', border: '1px solid #dfe3ea', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#14202e' }}>Novo tipo de película</span>
                  <button
                    type="button"
                    onClick={cancelarNovoTipo}
                    style={{ background: 'none', border: 'none', color: 'var(--mjr-navy)', cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancelar
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Material"
                  required
                  list="materiais-sugeridos-estoque"
                  value={novoTipoMaterial}
                  onChange={(e) => setNovoTipoMaterial(e.target.value)}
                  style={campo}
                />
                <input
                  type="text"
                  placeholder="Coloração (opcional)"
                  list="coloracoes-sugeridas-estoque"
                  value={novoTipoColoracao}
                  onChange={(e) => setNovoTipoColoracao(e.target.value)}
                  style={campo}
                />
                <input
                  type="text"
                  placeholder="Marca (opcional)"
                  value={novoTipoMarca}
                  onChange={(e) => setNovoTipoMarca(e.target.value)}
                  style={campo}
                />
                <datalist id="materiais-sugeridos-estoque">
                  <option value="Nano Ceramic" />
                  <option value="PAP" />
                  <option value="Fumê" />
                  <option value="Espelhado" />
                  <option value="Segurança" />
                </datalist>
                <datalist id="coloracoes-sugeridas-estoque">
                  <option value="G5" />
                  <option value="G20" />
                  <option value="G35" />
                  <option value="G50" />
                  <option value="G70" />
                </datalist>
                <button
                  type="button"
                  onClick={salvarNovoTipo}
                  disabled={criandoTipo}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--mjr-navy)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: criandoTipo ? 0.6 : 1,
                  }}
                >
                  {criandoTipo ? 'Salvando...' : 'Adicionar tipo'}
                </button>
              </div>
            )}
            </div>
            <label style={rotulo}>
              Identificação
              <input type="text" required placeholder="Ex: Rolo 01" value={identificacao} onChange={(e) => setIdentificacao(e.target.value)} style={campo} />
            </label>
          </div>

          <div style={cartao}>
            <div style={tituloCartao}>Medidas e custo</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ ...rotulo, flex: 1, minWidth: 0 }}>
                Largura
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="1,52"
                    value={larguraM}
                    onChange={(e) => setLarguraM(formatarDecimalDigitado(e.target.value))}
                    style={{ ...campo, paddingRight: 32 }}
                  />
                  <span style={sufixo}>m</span>
                </div>
              </label>
              <label style={{ ...rotulo, flex: 1, minWidth: 0 }}>
                Metragem inicial
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="30,00"
                    value={metragemInicial}
                    onChange={(e) => setMetragemInicial(formatarDecimalDigitado(e.target.value))}
                    style={{ ...campo, paddingRight: 32 }}
                  />
                  <span style={sufixo}>m</span>
                </div>
              </label>
            </div>
            {itemEditando && (
              <label style={rotulo}>
                Metragem atual
                <input type="text" disabled value={`${itemEditando.metragem_atual} m`} style={{ ...campo, color: '#6b7280' }} />
              </label>
            )}
            <label style={rotulo}>
              Custo do rolo
              <div style={{ position: 'relative' }}>
                <span style={{ ...sufixo, right: 'auto', left: 12 }}>R$</span>
                <CampoMoeda value={custo} onChange={setCusto} semPrefixo placeholder="0,00" style={{ ...campo, paddingLeft: 40 }} />
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={fecharForm}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                border: '1px solid #dfe3ea',
                background: '#FFFFFF',
                color: '#14202e',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            {itemEditando && (
              <button
                type="button"
                onClick={excluir}
                disabled={salvando}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
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
            <button
              type="submit"
              disabled={salvando}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                border: '1px solid #2a4f7f',
                background: 'var(--mjr-navy)',
                color: '#FFFFFF',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: salvando ? 0.6 : 1,
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            Estoque
          </h1>
          <button
            type="button"
            onClick={() => setActiveTab('tipos')}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #3A3A3A',
              background: '#232323',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tipos de película
          </button>
        </div>
        <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
          {itens.length} rolos
        </p>
      </header>

      {tiposComTotal.length > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '16px 20px', overflowX: 'auto' }}>
          {tiposComTotal.map((tipo) => {
            const baixo = tipo.total < LIMITE_ALERTA_M
            return (
              <div
                key={tipo.id}
                style={{
                  flexShrink: 0,
                  minWidth: 140,
                  background: baixo ? '#FCF3F1' : '#FFFFFF',
                  border: `1px solid ${baixo ? '#E9C9C4' : '#E2E0DC'}`,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 500, color: '#14202e' }}>{tipo.nome}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: baixo ? '#a32d2d' : 'var(--mjr-navy)', marginTop: 4 }}>
                  {formatarM(tipo.total)} m
                </div>
                {baixo && (
                  <div style={{ fontSize: 12, color: '#a32d2d', marginTop: 2 }}>Estoque baixo</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: '#9aa0ad' }}>Carregando...</div>}
        {!loading && itens.length === 0 && (
          <div style={{ color: '#9aa0ad' }}>Nenhum rolo cadastrado ainda.</div>
        )}
        {!loading && itens.map((item, index) => {
          const acabou = item.status === 'acabou'
          const baixo = Number(item.metragem_atual) < LIMITE_ALERTA_M
          const percentual = item.metragem_inicial > 0 ? Math.round(Math.min((item.metragem_atual / item.metragem_inicial) * 100, 100)) : 0
          return (
            <div
              key={item.id ?? index}
              onClick={() => abrirEdicao(item)}
              style={{
                cursor: 'pointer',
                background: baixo || acabou ? '#FCF3F1' : '#FFFFFF',
                border: `1px solid ${baixo || acabou ? '#E9C9C4' : '#E2E0DC'}`,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#14202e' }}>
                    {item.tipos_pelicula?.nome || item.identificacao || 'Tipo removido'}
                  </span>
                  {acabou && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: '#F5DAD6',
                        color: '#a32d2d',
                      }}
                    >
                      Acabou
                    </span>
                  )}
                </div>
                <span style={{ flexShrink: 0, fontSize: 18, fontWeight: 500, color: baixo ? '#a32d2d' : 'var(--mjr-navy)' }}>
                  {formatarM(item.metragem_atual)} m
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 999,
                  background: '#e5e7eb',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${percentual}%`,
                    height: '100%',
                    background: baixo ? 'var(--mjr-red)' : 'var(--mjr-navy)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                <span>
                  {[
                    item.largura_m ? `${formatarM(item.largura_m)} m de largura` : null,
                    `de ${formatarM(item.metragem_inicial)} m`,
                  ].filter(Boolean).join(' · ')}
                </span>
                <span style={{ flexShrink: 0 }}>{percentual}% restante</span>
              </div>

              {baixo && !acabou && (
                <div style={{ fontSize: 12, color: '#a32d2d', marginTop: 8 }}>
                  Menos de {LIMITE_ALERTA_M} m restantes
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BotaoFlutuante
        ativa={ativa}
        onClick={() => {
          setItemEditando(null)
          limparCampos()
          setMostrarForm(true)
        }}
      >
        +
      </BotaoFlutuante>
    </div>
  )
}

export default Estoque
