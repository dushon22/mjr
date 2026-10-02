import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import BotaoFlutuante from '../components/BotaoFlutuante'

function formatarValor(valor) {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const CATEGORIAS = [
  { value: 'automotivo', label: 'Automotivo' },
  { value: 'arquitetonico', label: 'Arquitetônico' },
]

const UNIDADES = [
  { value: 'un', label: 'Unidade' },
  { value: 'm2', label: 'm²' },
]

function Servicos({ setActiveTab, dataVersion, ativa }) {
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('automotivo')
  const [unidade, setUnidade] = useState('un')
  const [preco, setPreco] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [servicoEditando, setServicoEditando] = useState(null)

  function limparCampos() {
    setNome('')
    setCategoria('automotivo')
    setUnidade('un')
    setPreco('')
  }

  function abrirEdicao(servico) {
    setServicoEditando(servico)
    setNome(servico.nome ?? '')
    setCategoria(servico.categoria ?? 'automotivo')
    setUnidade(servico.unidade ?? 'un')
    setPreco(servico.preco != null ? String(servico.preco) : '')
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setServicoEditando(null)
    limparCampos()
  }

  async function carregarServicos() {
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao buscar serviços:', error)
    } else {
      setServicos(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (ativa) carregarServicos()
  }, [dataVersion, ativa])

  async function salvar(e) {
    e.preventDefault()
    if (servicoEditando && !window.confirm('Salvar alterações deste serviço?')) return
    setSalvando(true)
    const dados = {
      nome: nome.trim(),
      categoria,
      unidade,
      preco: preco === '' ? 0 : Number(preco),
    }
    const { error } = servicoEditando
      ? await supabase.from('servicos').update(dados).eq('id', servicoEditando.id)
      : await supabase.from('servicos').insert(dados)
    setSalvando(false)
    if (error) {
      console.error('Erro ao salvar serviço:', error)
      alert('Não foi possível salvar o serviço. Tente novamente.')
      return
    }
    fecharForm()
    await carregarServicos()
  }

  async function alternarAtivo() {
    const novoAtivo = !servicoEditando.ativo
    if (!window.confirm(`${novoAtivo ? 'Ativar' : 'Desativar'} este serviço?`)) return
    setSalvando(true)
    const { error } = await supabase
      .from('servicos')
      .update({ ativo: novoAtivo })
      .eq('id', servicoEditando.id)
    setSalvando(false)
    if (error) {
      console.error('Erro ao atualizar serviço:', error)
      alert('Não foi possível atualizar o serviço. Tente novamente.')
      return
    }
    fecharForm()
    await carregarServicos()
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
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF' }}>
        <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {servicoEditando ? 'Editar serviço' : 'Novo serviço'}
          </h1>
        </header>
        <form
          onSubmit={salvar}
          style={{
            padding: '20px 20px calc(var(--nav-bottom) + 100px) 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <label style={rotulo}>
            Nome
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
          </label>
          <label style={rotulo}>
            Categoria
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={campo}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label style={rotulo}>
            Unidade
            <select value={unidade} onChange={(e) => setUnidade(e.target.value)} style={campo}>
              {UNIDADES.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </label>
          <label style={rotulo}>
            Preço {unidade === 'm2' ? '(por m²)' : ''}
            <CampoMoeda value={preco} onChange={setPreco} style={campo} />
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
          {servicoEditando && (
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
              {servicoEditando.ativo ? 'Desativar' : 'Ativar'}
            </button>
          )}
        </form>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('tipos')}
          style={{ background: 'none', border: 'none', color: '#CFCFCF', fontSize: 13, padding: 0, marginBottom: 10, cursor: 'pointer' }}
        >
          ‹ Voltar para Tipos de película
        </button>
        <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
          Serviços
        </h1>
        <p style={{ margin: '4px 0 0', color: '#CFCFCF', fontSize: 13 }}>
          {servicos.filter((s) => s.ativo).length} ativos · {servicos.length} no total
        </p>
      </header>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
        {!loading && servicos.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhum serviço cadastrado ainda.</div>
        )}
        {!loading && servicos.map((servico, index) => (
          <div
            key={servico.id ?? index}
            onClick={() => abrirEdicao(servico)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FFFFFF',
              border: '1px solid #E4E7EC',
              borderRadius: 12,
              padding: 14,
              opacity: servico.ativo ? 1 : 0.6,
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{servico.nome}</div>
              <div style={{ fontSize: 13, color: '#8A8A8A', marginTop: 2 }}>
                {CATEGORIAS.find((c) => c.value === servico.categoria)?.label ?? servico.categoria}
                {' · '}
                {formatarValor(servico.preco)}
                {servico.unidade === 'm2' ? '/m²' : ''}
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: servico.ativo ? '#E9F3E9' : '#EFEFEF',
                color: servico.ativo ? '#4C7A4E' : '#8A8A8A',
              }}
            >
              {servico.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ))}
      </div>

      <BotaoFlutuante
        ativa={ativa}
        onClick={() => {
          setServicoEditando(null)
          limparCampos()
          setMostrarForm(true)
        }}
      >
        +
      </BotaoFlutuante>
    </div>
  )
}

export default Servicos
