import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoTelefone from '../components/CampoTelefone'
import CampoPlaca from '../components/CampoPlaca'
import { formatarTelefone, formatarPlaca } from '../utils/mascaras'

const filtros = ['Todos', 'Automotivo', 'Residencial', 'Comercial']

function iniciais(nome) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palavra) => palavra[0].toUpperCase())
    .join('')
}

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipo, setTipo] = useState('automotivo')
  const [veiculoImovel, setVeiculoImovel] = useState('')
  const [veiculoModelo, setVeiculoModelo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [clienteEditando, setClienteEditando] = useState(null)

  function limparCampos() {
    setNome('')
    setTelefone('')
    setTipo('automotivo')
    setVeiculoImovel('')
    setVeiculoModelo('')
    setObservacao('')
  }

  function abrirEdicao(cliente) {
    setClienteEditando(cliente)
    setNome(cliente.nome ?? '')
    setTelefone(cliente.telefone ?? '')
    setTipo(cliente.tipo ?? 'automotivo')
    setVeiculoImovel(cliente.veiculo_imovel ?? '')
    setVeiculoModelo(cliente.veiculo_modelo ?? '')
    setObservacao(cliente.observacao ?? '')
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setClienteEditando(null)
    limparCampos()
  }

  async function carregarClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Erro ao buscar clientes:', error)
    } else {
      setClientes(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  async function salvar(e) {
    e.preventDefault()
    if (clienteEditando && !window.confirm('Salvar alterações deste cliente?')) return
    setSalvando(true)
    const dados = { nome, telefone, tipo, veiculo_imovel: veiculoImovel, veiculo_modelo: veiculoModelo, observacao: observacao || null }
    const { error } = clienteEditando
      ? await supabase.from('clientes').update(dados).eq('id', clienteEditando.id)
      : await supabase.from('clientes').insert({ ...dados, status: 'em_dia' })
    setSalvando(false)
    if (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('Não foi possível salvar o cliente. Tente novamente.')
      return
    }
    fecharForm()
    await carregarClientes()
  }

  async function excluir() {
    setSalvando(true)
    const [ag, fin] = await Promise.all([
      supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('cliente_id', clienteEditando.id),
      supabase.from('financeiro').select('id', { count: 'exact', head: true }).eq('cliente_id', clienteEditando.id),
    ])
    if (ag.error || fin.error) {
      console.error('Erro ao verificar vínculos:', ag.error || fin.error)
      setSalvando(false)
      alert('Não foi possível verificar os vínculos do cliente. Tente novamente.')
      return
    }
    const qtdAg = ag.count ?? 0
    const qtdFin = fin.count ?? 0
    const mensagem = qtdAg || qtdFin
      ? `Este cliente possui ${qtdAg} agendamento(s) e ${qtdFin} conta(s) vinculada(s). Excluir mesmo assim?`
      : `Excluir o cliente ${clienteEditando.nome}?`
    if (!window.confirm(mensagem)) {
      setSalvando(false)
      return
    }
    const { error } = await supabase.from('clientes').delete().eq('id', clienteEditando.id)
    setSalvando(false)
    if (error) {
      console.error('Erro ao excluir cliente:', error)
      alert('Não foi possível excluir: ' + error.message)
      return
    }
    fecharForm()
    await carregarClientes()
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
      <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {clienteEditando ? 'Editar cliente' : 'Novo cliente'}
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
          <label style={rotulo}>
            Nome
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
          </label>
          <label style={rotulo}>
            Telefone
            <CampoTelefone value={telefone} onChange={setTelefone} style={campo} />
          </label>
          <label style={rotulo}>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={campo}>
              <option value="automotivo">Automotivo</option>
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
            </select>
          </label>
          <label style={rotulo}>
            {tipo === 'automotivo' ? 'Placa do veículo' : 'Endereço do imóvel'}
            {tipo === 'automotivo' ? (
              <CampoPlaca value={veiculoImovel} onChange={setVeiculoImovel} style={campo} />
            ) : (
              <input type="text" value={veiculoImovel} onChange={(e) => setVeiculoImovel(e.target.value)} style={campo} />
            )}
          </label>
          {tipo === 'automotivo' && (
            <label style={rotulo}>
              Modelo do veículo
              <input
                type="text"
                placeholder="Ex: Corolla 2020"
                value={veiculoModelo}
                onChange={(e) => setVeiculoModelo(e.target.value)}
                style={campo}
              />
            </label>
          )}
          <label style={rotulo}>
            Observação
            <textarea
              rows={3}
              placeholder="Opcional"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              style={{ ...campo, resize: 'vertical' }}
            />
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
            {clienteEditando && (
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
        <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
          Clientes
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#2A2A2A',
            borderRadius: 10,
            padding: '10px 12px',
            marginTop: 16,
          }}
        >
          <span style={{ color: '#FFFFFF' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome ou telefone"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: 16,
            }}
          />
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 20px',
          overflowX: 'auto',
        }}
      >
        {filtros.map((filtro, index) => {
          const ativo = index === 0
          return (
            <button
              key={filtro}
              type="button"
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: ativo ? 600 : 400,
                background: ativo ? '#171717' : '#FFFFFF',
                color: ativo ? '#FFFFFF' : '#8A8A8A',
                border: ativo ? 'none' : '1px solid #E2E0DC',
                cursor: 'pointer',
              }}
            >
              {index === 0 ? `Todos (${clientes.length})` : filtro}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
        {!loading && clientes.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhum cliente cadastrado ainda.</div>
        )}
        {!loading && clientes.map((cliente, index) => {
          const rosa = index % 2 === 0
          const pendente = cliente.status === 'pendente'
          return (
            <div
              key={cliente.id ?? index}
              onClick={() => abrirEdicao(cliente)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#FFFFFF',
                border: '1px solid #E4E7EC',
                borderRadius: 14,
                padding: 14,
                boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 700,
                  background: rosa ? '#E4EAF1' : '#EFEFEF',
                  color: rosa ? '#14304D' : '#4A4A4A',
                }}
              >
                {iniciais(cliente.nome)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{cliente.nome}</div>
                <div style={{ fontSize: 13, color: '#8A8A8A' }}>
                  {cliente.tipo === 'automotivo' ? formatarPlaca(cliente.veiculo_imovel) : cliente.veiculo_imovel}
                  {cliente.tipo === 'automotivo' && cliente.veiculo_modelo && ` · ${cliente.veiculo_modelo}`}
                  {' · '}
                  {formatarTelefone(cliente.telefone)}
                </div>
              </div>

              <span
                style={{
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: pendente ? '#FCF3F1' : '#E9F3E9',
                  color: pendente ? '#A6332C' : '#4C7A4E',
                }}
              >
                {pendente ? 'Pendente' : 'Em dia'}
              </span>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          setClienteEditando(null)
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

export default Clientes
