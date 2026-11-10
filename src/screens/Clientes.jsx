import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoTelefone from '../components/CampoTelefone'
import CampoPlaca from '../components/CampoPlaca'
import { formatarTelefone, formatarPlaca } from '../utils/mascaras'
import { CabecalhoTela, CorpoTela, ListaCartoes, LinhaLista, Filtros, BottomSheet, RodapeSheet, SeletorSegmentado, estiloCampo, estiloRotulo } from '../components/ui'
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

      {mostrarForm && (
        <BottomSheet
          titulo={clienteEditando ? 'Editar cliente' : 'Novo cliente'}
          onFechar={fecharForm}
          onSubmit={salvar}
          rodape={<RodapeSheet salvando={salvando} onExcluir={clienteEditando ? excluir : undefined} />}
        >
          <label style={estiloRotulo}>
            Nome
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} style={estiloCampo} />
          </label>
          <label style={estiloRotulo}>
            Telefone
            <CampoTelefone value={telefone} onChange={setTelefone} style={estiloCampo} />
          </label>
          <div style={estiloRotulo}>
            Categoria
            <SeletorSegmentado
              opcoes={[
                { valor: 'automotivo', rotulo: 'Automotivo' },
                { valor: 'residencial', rotulo: 'Residencial' },
                { valor: 'comercial', rotulo: 'Comercial' },
              ]}
              valor={tipo}
              onChange={setTipo}
            />
          </div>
          <label style={estiloRotulo}>
            {tipo === 'automotivo' ? 'Placa do veículo' : 'Endereço do imóvel'}
            {tipo === 'automotivo' ? (
              <CampoPlaca value={veiculoImovel} onChange={setVeiculoImovel} style={estiloCampo} />
            ) : (
              <input type="text" value={veiculoImovel} onChange={(e) => setVeiculoImovel(e.target.value)} style={estiloCampo} />
            )}
          </label>
          {tipo === 'automotivo' && (
            <label style={estiloRotulo}>
              Modelo do veículo
              <input
                type="text"
                placeholder="Ex: Corolla 2020"
                value={veiculoModelo}
                onChange={(e) => setVeiculoModelo(e.target.value)}
                style={estiloCampo}
              />
            </label>
          )}
          <label style={estiloRotulo}>
            Observação
            <textarea
              rows={3}
              placeholder="Opcional"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              style={{ ...estiloCampo, resize: 'vertical' }}
            />
          </label>
        </BottomSheet>
      )}
    </div>
  )
}

export default Clientes
