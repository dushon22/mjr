import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import { formatarDecimalDigitado, virgulaParaNumero } from '../utils/mascaras'

const LIMITE_ALERTA_M = 5

function Estoque({ setActiveTab }) {
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
  const [larguraM, setLarguraM] = useState('')
  const [metragemInicial, setMetragemInicial] = useState('')
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
    setLarguraM('')
    setMetragemInicial('')
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
      .select('*, tipos_pelicula(nome)')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Erro ao buscar estoque:', error)
    } else {
      setItens(data ?? [])
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
    carregarItens()
    carregarTipos()
  }, [])

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
      padding: '12px',
      borderRadius: 10,
      border: '1px solid #E4E7EC',
      fontSize: 16,
      background: '#FFFFFF',
    }
    const rotulo = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4A4A4A' }
    const tiposSelecionaveis = tipos.filter((t) => t.ativo || t.id === itemEditando?.tipo_id)
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {itemEditando ? 'Editar rolo' : 'Novo rolo'}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px dashed #D0D5DD', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4A4A' }}>Novo tipo de película</span>
                  <button
                    type="button"
                    onClick={cancelarNovoTipo}
                    style={{ background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer', fontSize: 13 }}
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
                    background: '#14304D',
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
            <input type="text" required value={identificacao} onChange={(e) => setIdentificacao(e.target.value)} style={campo} />
          </label>
          <label style={rotulo}>
            Largura (m)
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="1,52"
              value={larguraM}
              onChange={(e) => setLarguraM(formatarDecimalDigitado(e.target.value))}
              style={campo}
            />
          </label>
          <label style={rotulo}>
            Metragem inicial (m)
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="30,00"
              value={metragemInicial}
              onChange={(e) => setMetragemInicial(formatarDecimalDigitado(e.target.value))}
              style={campo}
            />
          </label>
          {itemEditando && (
            <label style={rotulo}>
              Metragem atual (m)
              <input type="text" disabled value={`${itemEditando.metragem_atual} m`} style={{ ...campo, color: '#8A8A8A' }} />
            </label>
          )}
          <label style={rotulo}>
            Custo
            <CampoMoeda value={custo} onChange={setCusto} style={campo} />
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
            {itemEditando && (
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
            )}
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
        </form>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
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
                <div style={{ fontSize: 13, fontWeight: 600 }}>{tipo.nome}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: baixo ? '#A6332C' : '#171717', marginTop: 4 }}>
                  {tipo.total} m
                </div>
                {baixo && (
                  <div style={{ fontSize: 12, color: '#A6332C', marginTop: 2 }}>Estoque baixo</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
        {!loading && itens.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhum rolo cadastrado ainda.</div>
        )}
        {!loading && itens.map((item, index) => {
          const acabou = item.status === 'acabou'
          const baixo = Number(item.metragem_atual) < LIMITE_ALERTA_M
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
                  marginBottom: 6,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#8A8A8A' }}>
                    {item.tipos_pelicula?.nome || 'Tipo removido'}
                  </div>
                  <span style={{ fontWeight: 600 }}>{item.identificacao}</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: acabou ? '#F5DAD6' : '#E9F3E9',
                    color: acabou ? '#A6332C' : '#4C7A4E',
                  }}
                >
                  {acabou ? 'Acabou' : 'Ativo'}
                </span>
              </div>

              <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 8 }}>
                {item.largura_m ? `${item.largura_m} m largura · ` : ''}
                <span style={{ color: baixo ? '#A6332C' : '#8A8A8A', fontWeight: baixo ? 600 : 400 }}>
                  {item.metragem_atual} / {item.metragem_inicial} m
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 999,
                  background: '#E2E0DC',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${item.metragem_inicial > 0 ? Math.min((item.metragem_atual / item.metragem_inicial) * 100, 100) : 0}%`,
                    height: '100%',
                    background: baixo ? '#A6332C' : '#171717',
                  }}
                />
              </div>

              {baixo && !acabou && (
                <div style={{ fontSize: 12, color: '#A6332C', marginTop: 8 }}>
                  Menos de {LIMITE_ALERTA_M} m restantes
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          setItemEditando(null)
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

export default Estoque
