import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoTelefone from '../components/CampoTelefone'
import CampoPlaca from '../components/CampoPlaca'
import { formatarTelefone, formatarPlaca } from '../utils/mascaras'
import { CabecalhoTela, CorpoTela, ListaCartoes, LinhaLista, Filtros } from '../components/ui'
import BotaoFlutuante from '../components/BotaoFlutuante'

const filtros = ['Todos', 'Automotivo', 'Residencial', 'Comercial']

function Clientes({ dataVersion, ativa }) {
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
    if (ativa) carregarClientes()
  }, [dataVersion, ativa])

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
      <div style={{ minHeight: '100dvh', background: '#FFFFFF' }}>
        <header style={{ background: 'var(--mjr-bg)', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {clienteEditando ? 'Editar cliente' : 'Novo cliente'}
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
                borderRadius: 10,
                border: 'none',
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
      <CabecalhoTela titulo="Clientes">
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
              WebkitTextFillColor: '#FFFFFF',
              fontSize: 16,
            }}
          />
        </div>
      </CabecalhoTela>

      <Filtros
        opcoes={filtros.map((filtro, index) => (index === 0 ? `Todos (${clientes.length})` : filtro))}
        ativo={`Todos (${clientes.length})`}
      />

      <CorpoTela>
        {loading && <div style={{ color: '#9aa0ad' }}>Carregando...</div>}
        {!loading && clientes.length === 0 && (
          <div style={{ color: '#9aa0ad' }}>Nenhum cliente cadastrado ainda.</div>
        )}
        <ListaCartoes>
          {!loading && clientes.map((cliente, index) => {
            const pendente = cliente.status === 'pendente'
            return (
              <LinhaLista
                key={cliente.id ?? index}
                onClick={() => abrirEdicao(cliente)}
                cor={pendente ? '#F2B84B' : '#4C7A4E'}
                nome={cliente.nome}
                apoio={[
                  [
                    cliente.tipo ? cliente.tipo.charAt(0).toUpperCase() + cliente.tipo.slice(1) : null,
                    cliente.tipo === 'automotivo'
                      ? cliente.veiculo_modelo || formatarPlaca(cliente.veiculo_imovel)
                      : cliente.veiculo_imovel,
                  ].filter(Boolean).join(' · '),
                ]}
                etiqueta={{ tom: pendente ? 'ambar' : 'verde', texto: pendente ? 'Pendente' : 'Em dia' }}
              />
            )
          })}
        </ListaCartoes>
      </CorpoTela>

      <BotaoFlutuante
        ativa={ativa}
        onClick={() => {
          setClienteEditando(null)
          limparCampos()
          setMostrarForm(true)
        }}
      >
        +
      </BotaoFlutuante>
    </div>
  )
}

export default Clientes
