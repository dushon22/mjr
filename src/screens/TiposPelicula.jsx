import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoSelectComNovo from '../components/CampoSelectComNovo'

const MATERIAIS_PADRAO = ['Nano Ceramic', 'PAP', 'Fumê', 'Espelhado', 'Segurança']
const COLORACOES_PADRAO = ['G5', 'G20', 'G35', 'G50', 'G70']

// Padrões + valores salvos, sem vazios e sem duplicar (ignorando maiúsculas/minúsculas).
function juntarOpcoes(padroes, salvos) {
  const opcoes = []
  for (const v of [...padroes, ...salvos.map((s) => (s ?? '').trim()).filter(Boolean)]) {
    if (!opcoes.some((o) => o.toLowerCase() === v.toLowerCase())) opcoes.push(v)
  }
  return opcoes
}

// Ordena pelo número (G5, G20, G35...); valores sem número vão para o fim, em ordem alfabética.
function compararColoracao(a, b) {
  const na = a.match(/\d+/)
  const nb = b.match(/\d+/)
  if (na && nb && Number(na[0]) !== Number(nb[0])) return Number(na[0]) - Number(nb[0])
  if (na && !nb) return -1
  if (!na && nb) return 1
  return a.localeCompare(b, 'pt-BR')
}

function TiposPelicula({ setActiveTab, dataVersion, ativa }) {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [material, setMaterial] = useState('')
  const [coloracao, setColoracao] = useState('')
  const [marca, setMarca] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [tipoEditando, setTipoEditando] = useState(null)

  function limparCampos() {
    setMaterial('')
    setColoracao('')
    setMarca('')
  }

  function abrirEdicao(tipo) {
    setTipoEditando(tipo)
    setMaterial(tipo.material ?? '')
    setColoracao(tipo.coloracao ?? '')
    setMarca(tipo.marca ?? '')
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setTipoEditando(null)
    limparCampos()
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
    setLoading(false)
  }

  useEffect(() => {
    if (ativa) carregarTipos()
  }, [dataVersion, ativa])

  async function salvar(e) {
    e.preventDefault()
    if (tipoEditando && !window.confirm('Salvar alterações deste tipo de película?')) return
    setSalvando(true)
    const materialTrim = material.trim()
    const coloracaoTrim = coloracao.trim()
    const nome = coloracaoTrim ? `${materialTrim} ${coloracaoTrim}` : materialTrim
    const dados = { nome, material: materialTrim, coloracao: coloracaoTrim || null, marca: marca || null }
    const { error } = tipoEditando
      ? await supabase.from('tipos_pelicula').update(dados).eq('id', tipoEditando.id)
      : await supabase.from('tipos_pelicula').insert(dados)
    setSalvando(false)
    if (error) {
      console.error('Erro ao salvar tipo de película:', error)
      alert('Não foi possível salvar o tipo de película. Tente novamente.')
      return
    }
    fecharForm()
    await carregarTipos()
  }

  async function alternarAtivo() {
    const novoAtivo = !tipoEditando.ativo
    if (!window.confirm(`${novoAtivo ? 'Ativar' : 'Desativar'} este tipo de película?`)) return
    setSalvando(true)
    const { error } = await supabase
      .from('tipos_pelicula')
      .update({ ativo: novoAtivo })
      .eq('id', tipoEditando.id)
    setSalvando(false)
    if (error) {
      console.error('Erro ao atualizar tipo de película:', error)
      alert('Não foi possível atualizar o tipo de película. Tente novamente.')
      return
    }
    fecharForm()
    await carregarTipos()
  }

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
    const opcoesMaterial = juntarOpcoes(MATERIAIS_PADRAO, tipos.map((t) => t.material))
    opcoesMaterial.sort((a, b) => a.localeCompare(b, 'pt-BR'))
    const opcoesColoracao = juntarOpcoes(COLORACOES_PADRAO, tipos.map((t) => t.coloracao))
    opcoesColoracao.sort(compararColoracao)
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {tipoEditando ? 'Editar tipo de película' : 'Novo tipo de película'}
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
          <CampoSelectComNovo
            label="Material"
            required
            value={material}
            onChange={setMaterial}
            opcoes={opcoesMaterial}
            textoNovo="+ Novo material"
            placeholderNovo="Nome do novo material"
            style={campo}
            labelStyle={rotulo}
          />
          <CampoSelectComNovo
            label="Coloração"
            value={coloracao}
            onChange={setColoracao}
            opcoes={opcoesColoracao}
            textoNovo="+ Nova coloração"
            placeholderNovo="Nome da nova coloração"
            style={campo}
            labelStyle={rotulo}
          />
          <label style={rotulo}>
            Marca
            <input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} style={campo} />
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
          {tipoEditando && (
            <button
              type="button"
              onClick={alternarAtivo}
              disabled={salvando}
              style={{
                padding: 12,
                borderRadius: 10,
                border: '1px solid #171717',
                background: '#FFFFFF',
                color: '#171717',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tipoEditando.ativo ? 'Desativar' : 'Ativar'}
            </button>
          )}
        </form>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveTab('estoque')}
            style={{ background: 'none', border: 'none', color: '#CFCFCF', fontSize: 13, padding: 0, cursor: 'pointer' }}
          >
            ‹ Voltar para Estoque
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('servicos')}
            style={{ background: 'none', border: 'none', color: '#CFCFCF', fontSize: 13, padding: 0, cursor: 'pointer' }}
          >
            Serviços ›
          </button>
        </div>
        <h1 style={{ margin: '10px 0 0', color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
          Tipos de película
        </h1>
        <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
          {tipos.filter((t) => t.ativo).length} ativos · {tipos.length} no total
        </p>
      </header>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
        {!loading && tipos.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhum tipo de película cadastrado ainda.</div>
        )}
        {!loading && tipos.map((tipo, index) => (
          <div
            key={tipo.id ?? index}
            onClick={() => abrirEdicao(tipo)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FFFFFF',
              border: '1px solid #E4E7EC',
              borderRadius: 12,
              padding: 14,
              opacity: tipo.ativo ? 1 : 0.6,
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{tipo.material || tipo.nome}</div>
              {(tipo.coloracao || tipo.marca) && (
                <div style={{ fontSize: 13, color: '#8A8A8A', marginTop: 2 }}>
                  {[tipo.coloracao, tipo.marca].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: tipo.ativo ? '#E9F3E9' : '#EFEFEF',
                color: tipo.ativo ? '#4C7A4E' : '#8A8A8A',
              }}
            >
              {tipo.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setTipoEditando(null)
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

export default TiposPelicula
