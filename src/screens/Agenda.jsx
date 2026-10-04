import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import CampoMoeda from '../components/CampoMoeda'
import CampoTelefone from '../components/CampoTelefone'
import { formatarTelefone, formatarDecimalDigitado, virgulaParaNumero } from '../utils/mascaras'
import BotaoFlutuante from '../components/BotaoFlutuante'

const ROTULOS_DIA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']

const ORDEM_SERVICOS = ['para-brisa', 'vidros laterais', 'vidro traseiro', 'todos os vidros exceto para-brisa', 'completo']

function normalizarNome(nome) {
  return (nome ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Serviços conhecidos na ordem de ORDEM_SERVICOS; os demais depois, em ordem alfabética.
function compararServicos(a, b) {
  const ia = ORDEM_SERVICOS.indexOf(normalizarNome(a.nome))
  const ib = ORDEM_SERVICOS.indexOf(normalizarNome(b.nome))
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  }
  return a.nome.localeCompare(b.nome, 'pt-BR')
}

function paraISO(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// Segunda a sexta da semana de `base`; sábado e domingo caem na semana seguinte.
function diasDaSemana(base) {
  const dow = base.getDay()
  const deslocamento = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow
  return ROTULOS_DIA.map((label, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deslocamento + i)
    return { label, numero: d.getDate(), iso: paraISO(d) }
  })
}

// Datas ISO do mês de `d`, com null nos espaços antes do dia 1 (grid começa no domingo).
function celulasDoMes(d) {
  const ano = d.getFullYear()
  const mes = d.getMonth()
  const vazios = new Date(ano, mes, 1).getDay()
  const total = new Date(ano, mes + 1, 0).getDate()
  return [
    ...Array(vazios).fill(null),
    ...Array.from({ length: total }, (_, i) => paraISO(new Date(ano, mes, i + 1))),
  ]
}

function rotuloMes(d) {
  const texto = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(' de ', ' ')
}

function formatarData(data) {
  const [ano, mes, dia] = data.slice(0, 10).split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function formatarValor(valor) {
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pluralizar(n, singular, plural) {
  return n === 1 ? singular : plural
}

// agendamento_id é unique em ordens_servico, então o PostgREST retorna objeto, não array.
function obterOsDoAgendamento(ag) {
  const os = ag.ordens_servico
  if (!os) return null
  return Array.isArray(os) ? os[0] ?? null : os
}

function calcularStatusAgendamento(ag) {
  const os = obterOsDoAgendamento(ag)
  if (os && os.status !== 'aberta') {
    return {
      label: 'Concluído',
      icone: '✓',
      corBorda: '#4C7A4E',
      corBadgeBg: '#E9F3E9',
      corBadgeTexto: '#4C7A4E',
      os,
    }
  }
  const dataHora = ag.data && ag.hora ? new Date(`${ag.data.slice(0, 10)}T${ag.hora.slice(0, 5)}:00`) : null
  const jaPassou = dataHora ? dataHora.getTime() < Date.now() : false
  if (jaPassou) {
    return {
      label: 'Pendente',
      icone: '',
      corBorda: '#D97706',
      corBadgeBg: '#FEF3C7',
      corBadgeTexto: '#92400E',
      os,
    }
  }
  return {
    label: 'Agendado',
    icone: '',
    corBorda: '#2563EB',
    corBadgeBg: '#DBEAFE',
    corBadgeTexto: '#1D4ED8',
    os,
  }
}

function Agenda({ abrirOS, dataVersion, ativa }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState([])
  const [tipos, setTipos] = useState([])
  const [servicos, setServicos] = useState([])

  const [mostrarForm, setMostrarForm] = useState(false)
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState('')
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false)
  const [novoClienteAtivo, setNovoClienteAtivo] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
  const [veiculoModelo, setVeiculoModelo] = useState('')
  const [novoTipoIndex, setNovoTipoIndex] = useState(null)
  const [novoTipoMaterial, setNovoTipoMaterial] = useState('')
  const [novoTipoColoracao, setNovoTipoColoracao] = useState('')
  const [novoTipoMarca, setNovoTipoMarca] = useState('')
  const [criandoTipo, setCriandoTipo] = useState(false)
  const [servico, setServico] = useState('')
  const [categoriaServico, setCategoriaServico] = useState('automotivo')
  const [valorCombinado, setValorCombinado] = useState('')
  const [itens, setItens] = useState([])
  const [novoServicoIndex, setNovoServicoIndex] = useState(null)
  const [novoServicoNome, setNovoServicoNome] = useState('')
  const [novoServicoUnidade, setNovoServicoUnidade] = useState('un')
  const [novoServicoPreco, setNovoServicoPreco] = useState('')
  const [criandoServico, setCriandoServico] = useState(false)
  const [observacao, setObservacao] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [local, setLocal] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [agendamentoEditando, setAgendamentoEditando] = useState(null)

  const [dataBase, setDataBase] = useState(() => new Date())
  const [diaSelecionado, setDiaSelecionado] = useState(() => paraISO(new Date()))
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mesCalendario, setMesCalendario] = useState(() => new Date())

  const mostrarVeiculoModelo = categoriaServico !== 'arquitetonico'
  const servicosFiltrados = servicos.filter((s) => s.categoria === categoriaServico).sort(compararServicos)
  const totalItens = itens.reduce((soma, item) => soma + (item.valor === '' ? 0 : Number(item.valor)), 0)

  function mudarCategoriaServico(valor) {
    setCategoriaServico(valor)
    setItens([])
    cancelarNovoServico()
  }

  function abrirCadastroServico(index) {
    setNovoServicoIndex(index)
    setNovoServicoNome('')
    setNovoServicoUnidade('un')
    setNovoServicoPreco('')
  }

  function cancelarNovoServico() {
    setNovoServicoIndex(null)
    setNovoServicoNome('')
    setNovoServicoUnidade('un')
    setNovoServicoPreco('')
  }

  async function salvarNovoServico() {
    const nomeNovo = novoServicoNome.trim()
    if (!nomeNovo) {
      alert('Informe o nome do serviço.')
      return
    }
    const index = novoServicoIndex
    const existente = servicos.find(
      (s) => s.categoria === categoriaServico && normalizarNome(s.nome) === normalizarNome(nomeNovo),
    )
    if (existente) {
      mudarItemServico(index, existente.id)
      cancelarNovoServico()
      return
    }
    setCriandoServico(true)
    const { data: servicoCriado, error } = await supabase
      .from('servicos')
      .insert({
        nome: nomeNovo,
        categoria: categoriaServico,
        unidade: novoServicoUnidade,
        preco: novoServicoPreco === '' ? 0 : Number(novoServicoPreco),
        ativo: true,
      })
      .select('*')
      .single()
    setCriandoServico(false)
    if (error) {
      console.error('Erro ao cadastrar serviço:', error)
      alert('Não foi possível cadastrar o serviço. Tente novamente.')
      return
    }
    await carregarServicos()
    setItens((atual) => atual.map((item, i) => {
      if (i !== index) return item
      const quantidade = servicoCriado.unidade === 'm2' ? (item.quantidade || '1') : '1'
      const qtd = Number(virgulaParaNumero(quantidade) || 0)
      const valor = novoServicoPreco === '' ? '' : (Number(servicoCriado.preco) * qtd).toFixed(2)
      return { ...item, servico_id: servicoCriado.id, quantidade, valor }
    }))
    cancelarNovoServico()
  }

  function calcularValorItem(servicoId, quantidadeTexto) {
    const servicoSelecionado = servicos.find((s) => s.id === servicoId)
    if (!servicoSelecionado) return ''
    const qtd = Number(virgulaParaNumero(quantidadeTexto) || 0)
    return (Number(servicoSelecionado.preco) * qtd).toFixed(2)
  }

  function adicionarItem() {
    // Pré-seleciona a película do item anterior (editável).
    setItens((atual) => [
      ...atual,
      { servico_id: '', tipo_pelicula_id: atual[atual.length - 1]?.tipo_pelicula_id ?? '', quantidade: '1', valor: '' },
    ])
  }

  function mudarItemServico(index, servicoId) {
    setItens((atual) => atual.map((item, i) => {
      if (i !== index) return item
      const servicoSelecionado = servicos.find((s) => s.id === servicoId)
      const quantidade = servicoSelecionado?.unidade === 'm2' ? (item.quantidade || '1') : '1'
      return { ...item, servico_id: servicoId, quantidade, valor: calcularValorItem(servicoId, quantidade) }
    }))
  }

  function mudarItemTipo(index, tipoId) {
    setItens((atual) => atual.map((item, i) => (i === index ? { ...item, tipo_pelicula_id: tipoId } : item)))
  }

  function mudarItemQuantidade(index, quantidadeTexto) {
    setItens((atual) => atual.map((item, i) => (i === index
      ? { ...item, quantidade: quantidadeTexto, valor: calcularValorItem(item.servico_id, quantidadeTexto) }
      : item)))
  }

  function mudarItemValor(index, valor) {
    setItens((atual) => atual.map((item, i) => (i === index ? { ...item, valor } : item)))
  }

  function removerItem(index) {
    setItens((atual) => atual.filter((_, i) => i !== index))
    cancelarNovoServico()
    cancelarNovoTipo()
  }

  function limparCampos() {
    cancelarNovoServico()
    cancelarNovoTipo()
    setClienteSelecionadoId('')
    setClienteBusca('')
    setClienteDropdownAberto(false)
    setNovoClienteAtivo(false)
    setNovoClienteNome('')
    setNovoClienteTelefone('')
    setVeiculoModelo('')
    setServico('')
    setCategoriaServico('automotivo')
    setValorCombinado('')
    setItens([])
    setObservacao('')
    setData('')
    setHora('')
    setLocal('')
  }

  function abrirEdicao(ag) {
    setAgendamentoEditando(ag)
    setClienteSelecionadoId(ag.cliente_id ?? '')
    setClienteBusca(ag.clientes?.nome ?? '')
    setClienteDropdownAberto(false)
    setNovoClienteAtivo(false)
    setNovoClienteNome('')
    setNovoClienteTelefone('')
    setVeiculoModelo(ag.veiculo_modelo ?? '')
    cancelarNovoTipo()
    setServico(ag.servico ?? '')
    setCategoriaServico(ag.categoria ?? 'automotivo')
    setValorCombinado(ag.valor != null ? String(ag.valor) : '')
    // Itens antigos sem película usam a película do agendamento.
    setItens((ag.agendamento_itens ?? []).map((item) => ({
      servico_id: item.servico_id ?? '',
      tipo_pelicula_id: item.tipo_pelicula_id ?? ag.tipo_id ?? '',
      quantidade: item.quantidade != null ? String(item.quantidade) : '1',
      valor: item.valor != null ? String(item.valor) : '',
    })))
    setObservacao(ag.observacao ?? '')
    setData(ag.data ? ag.data.slice(0, 10) : '')
    setHora(ag.hora ? ag.hora.slice(0, 5) : '')
    setLocal(ag.local ?? '')
    setMostrarForm(true)
  }

  function selecionarCliente(c) {
    setClienteSelecionadoId(c.id)
    setClienteBusca(c.nome)
    setClienteDropdownAberto(false)
    setVeiculoModelo(c.veiculo_modelo ?? '')
  }

  function abrirCadastroCliente() {
    setNovoClienteNome(clienteBusca.trim())
    setNovoClienteTelefone('')
    setNovoClienteAtivo(true)
    setClienteDropdownAberto(false)
  }

  function cancelarNovoCliente() {
    setNovoClienteAtivo(false)
    setNovoClienteNome('')
    setNovoClienteTelefone('')
    setClienteBusca('')
    setClienteSelecionadoId('')
  }

  function abrirCadastroTipo(index) {
    setNovoTipoMaterial('')
    setNovoTipoColoracao('')
    setNovoTipoMarca('')
    setNovoTipoIndex(index)
  }

  function cancelarNovoTipo() {
    setNovoTipoIndex(null)
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
      .select('id, nome')
      .single()
    setCriandoTipo(false)
    if (error) {
      console.error('Erro ao cadastrar tipo de película:', error)
      alert('Não foi possível cadastrar o tipo de película. Tente novamente.')
      return
    }
    setTipos((atual) => [...atual, tipoCriado].sort((a, b) => a.nome.localeCompare(b.nome)))
    mudarItemTipo(novoTipoIndex, tipoCriado.id)
    cancelarNovoTipo()
  }

  function fecharForm() {
    setMostrarForm(false)
    setAgendamentoEditando(null)
    limparCampos()
  }

  async function carregarAgendamentos() {
    const { data: dados, error } = await supabase
      .from('agendamentos')
      .select('*, clientes(nome), tipos_pelicula(nome), ordens_servico(id, status, valor_pago), agendamento_itens(*, servicos(nome, unidade))')
      .order('data', { ascending: true })
      .order('hora', { ascending: true })
    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
    } else {
      setAgendamentos(dados ?? [])
    }
    setLoading(false)
  }

  async function carregarClientes() {
    const { data: dados, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone, tipo, veiculo_modelo, observacao')
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao buscar clientes:', error)
    } else {
      setClientes(dados ?? [])
    }
  }

  async function carregarServicos() {
    const { data: dados, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao buscar serviços:', error)
    } else {
      setServicos(dados ?? [])
    }
  }

  async function carregarTipos() {
    const { data: dados, error } = await supabase
      .from('tipos_pelicula')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao buscar tipos de película:', error)
    } else {
      setTipos(dados ?? [])
    }
  }

  useEffect(() => {
    if (!ativa) return
    carregarAgendamentos()
    carregarClientes()
    carregarTipos()
    carregarServicos()
  }, [dataVersion, ativa])

  async function salvar(e) {
    e.preventDefault()
    const itensValidos = itens.filter((item) => item.servico_id)
    // A coluna antiga de película do agendamento recebe a do primeiro item (Início e listas usam ela).
    const tipoIdAgendamento = itensValidos[0]?.tipo_pelicula_id || agendamentoEditando?.tipo_id || null
    if (itensValidos.some((item) => !item.tipo_pelicula_id)) {
      alert('Selecione o tipo de película de cada item.')
      return
    }
    if (!tipoIdAgendamento) {
      alert('Adicione ao menos um item com tipo de película.')
      return
    }
    if (agendamentoEditando && !window.confirm('Salvar alterações deste agendamento?')) return
    setSalvando(true)

    let clienteIdFinal = clienteSelecionadoId || null

    if (novoClienteAtivo) {
      const nomeNovoCliente = novoClienteNome.trim()
      if (!nomeNovoCliente) {
        setSalvando(false)
        alert('Informe o nome do cliente.')
        return
      }
      const { data: clienteCriado, error: erroCliente } = await supabase
        .from('clientes')
        .insert({
          nome: nomeNovoCliente,
          telefone: novoClienteTelefone || null,
          tipo: 'automotivo',
          status: 'em_dia',
        })
        .select('id')
        .single()
      if (erroCliente) {
        console.error('Erro ao cadastrar cliente:', erroCliente)
        setSalvando(false)
        alert('Não foi possível cadastrar o cliente. Tente novamente.')
        return
      }
      clienteIdFinal = clienteCriado.id
    }

    const nomesItens = itens
      .map((item) => servicos.find((s) => s.id === item.servico_id)?.nome)
      .filter(Boolean)
    const servicoFinal = nomesItens.length > 0 ? nomesItens.join(' + ') : servico

    const dados = {
      cliente_id: clienteIdFinal,
      tipo_id: tipoIdAgendamento,
      categoria: categoriaServico,
      servico: servicoFinal,
      valor: itens.length > 0 ? Number(totalItens.toFixed(2)) : (valorCombinado === '' ? null : Number(valorCombinado)),
      data,
      hora,
      local,
      veiculo_modelo: mostrarVeiculoModelo ? veiculoModelo : null,
      observacao: observacao || null,
    }
    let agendamentoId = agendamentoEditando?.id ?? null
    const resultado = agendamentoEditando
      ? await supabase.from('agendamentos').update(dados).eq('id', agendamentoEditando.id)
      : await supabase.from('agendamentos').insert(dados).select('id').single()
    const error = resultado.error
    if (!agendamentoEditando && resultado.data) {
      agendamentoId = resultado.data.id
    }
    if (error) {
      setSalvando(false)
      console.error('Erro ao salvar agendamento:', error)
      alert('Não foi possível salvar o agendamento. Tente novamente.')
      return
    }

    if (agendamentoId) {
      await supabase.from('agendamento_itens').delete().eq('agendamento_id', agendamentoId)
      if (itensValidos.length > 0) {
        const { error: erroItens } = await supabase.from('agendamento_itens').insert(
          itensValidos.map((item) => ({
            agendamento_id: agendamentoId,
            servico_id: item.servico_id,
            tipo_pelicula_id: item.tipo_pelicula_id,
            quantidade: item.quantidade === '' ? 1 : Number(virgulaParaNumero(item.quantidade)),
            valor: item.valor === '' ? 0 : Number(item.valor),
          }))
        )
        if (erroItens) {
          console.error('Erro ao salvar itens do agendamento:', erroItens)
          alert('Agendamento salvo, mas não foi possível salvar os itens. Tente novamente.')
        }
      }
    }

    setSalvando(false)
    fecharForm()
    await carregarAgendamentos()
    if (novoClienteAtivo) await carregarClientes()
  }

  async function excluir() {
    if (!window.confirm('Excluir este agendamento?')) return
    setSalvando(true)
    const { error } = await supabase.from('agendamentos').delete().eq('id', agendamentoEditando.id)
    setSalvando(false)
    if (error) {
      console.error('Erro ao excluir agendamento:', error)
      alert('Não foi possível excluir o agendamento. Tente novamente.')
      return
    }
    fecharForm()
    await carregarAgendamentos()
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
    const termoBuscaCliente = clienteBusca.trim().toLowerCase()
    const termoBuscaDigitos = termoBuscaCliente.replace(/\D/g, '')
    const clientesFiltrados = termoBuscaCliente
      ? clientes.filter(
          (c) =>
            c.nome.toLowerCase().includes(termoBuscaCliente) ||
            (termoBuscaDigitos && (c.telefone ?? '').replace(/\D/g, '').includes(termoBuscaDigitos))
        )
      : clientes
    return (
      <div style={{ minHeight: '100dvh', background: '#FFFFFF' }}>
        <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            {agendamentoEditando ? 'Editar agendamento' : 'Novo agendamento'}
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
            Tipo de serviço
            <select
              required
              value={categoriaServico}
              onChange={(e) => mudarCategoriaServico(e.target.value)}
              style={campo}
            >
              <option value="automotivo">Automotivo</option>
              <option value="arquitetonico">Arquitetônico</option>
            </select>
          </label>
          <div style={rotulo}>
            <span>Cliente</span>
            {!novoClienteAtivo && (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone"
                  value={clienteBusca}
                  onChange={(e) => {
                    setClienteBusca(e.target.value)
                    setClienteSelecionadoId('')
                    setClienteDropdownAberto(true)
                  }}
                  onFocus={() => setClienteDropdownAberto(true)}
                  onBlur={() => setTimeout(() => setClienteDropdownAberto(false), 150)}
                  style={campo}
                />
                {clienteDropdownAberto && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      marginTop: 4,
                      background: '#FFFFFF',
                      border: '1px solid #E4E7EC',
                      borderRadius: 10,
                      maxHeight: 200,
                      overflowY: 'auto',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                    }}
                  >
                    {clientesFiltrados.map((c) => (
                      <div
                        key={c.id}
                        onMouseDown={() => selecionarCliente(c)}
                        style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #F0EEEA' }}
                      >
                        {c.nome}
                        {c.telefone ? ` · ${formatarTelefone(c.telefone)}` : ''}
                      </div>
                    ))}
                    {termoBuscaCliente && clientesFiltrados.length === 0 && (
                      <div
                        onMouseDown={abrirCadastroCliente}
                        style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, color: '#14304D', fontWeight: 600 }}
                      >
                        + Cadastrar "{clienteBusca.trim()}"
                      </div>
                    )}
                    {!termoBuscaCliente && clientesFiltrados.length === 0 && (
                      <div style={{ padding: '10px 12px', fontSize: 13, color: '#8A8A8A' }}>
                        Nenhum cliente cadastrado.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {novoClienteAtivo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px dashed #D0D5DD', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4A4A' }}>Novo cliente</span>
                  <button
                    type="button"
                    onClick={cancelarNovoCliente}
                    style={{ background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancelar
                  </button>
                </div>
                <label style={rotulo}>
                  Nome
                  <input
                    type="text"
                    required
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    style={campo}
                  />
                </label>
                <label style={rotulo}>
                  Telefone
                  <CampoTelefone value={novoClienteTelefone} onChange={setNovoClienteTelefone} style={campo} />
                </label>
              </div>
            )}
          </div>
          {mostrarVeiculoModelo && (
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
          <div style={rotulo}>
            <span>Itens</span>
            {itens.map((item, index) => {
              const servicoItem = servicos.find((s) => s.id === item.servico_id)
              return (
                <div
                  key={index}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid #E4E7EC', borderRadius: 10 }}
                >
                  <select
                    required
                    value={item.servico_id}
                    onChange={(e) => {
                      if (e.target.value === '__novo__') {
                        abrirCadastroServico(index)
                        return
                      }
                      mudarItemServico(index, e.target.value)
                    }}
                    style={campo}
                  >
                    <option value="" disabled>Selecione um serviço</option>
                    {servicosFiltrados.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                    <option value="__novo__">+ Novo serviço</option>
                  </select>
                  {novoServicoIndex === index && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px dashed #D0D5DD', borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#4A4A4A' }}>Novo serviço</span>
                        <button
                          type="button"
                          onClick={cancelarNovoServico}
                          style={{ background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer', fontSize: 13 }}
                        >
                          Cancelar
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nome"
                        value={novoServicoNome}
                        onChange={(e) => setNovoServicoNome(e.target.value)}
                        style={campo}
                      />
                      <select value={novoServicoUnidade} onChange={(e) => setNovoServicoUnidade(e.target.value)} style={campo}>
                        <option value="un">un</option>
                        <option value="m2">m²</option>
                      </select>
                      <CampoMoeda
                        value={novoServicoPreco}
                        onChange={setNovoServicoPreco}
                        placeholder={novoServicoUnidade === 'm2' ? 'Preço por m² (opcional)' : 'Preço (opcional)'}
                        style={campo}
                      />
                      <button
                        type="button"
                        onClick={salvarNovoServico}
                        disabled={criandoServico}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: 'none',
                          background: '#14304D',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          cursor: 'pointer',
                          opacity: criandoServico ? 0.6 : 1,
                        }}
                      >
                        {criandoServico ? 'Salvando...' : 'Adicionar serviço'}
                      </button>
                    </div>
                  )}
                  <select
                    required
                    value={item.tipo_pelicula_id}
                    onChange={(e) => {
                      if (e.target.value === '__novo__') {
                        abrirCadastroTipo(index)
                        return
                      }
                      mudarItemTipo(index, e.target.value)
                    }}
                    style={campo}
                  >
                    <option value="" disabled>
                      {tipos.length ? 'Tipo de película' : 'Nenhum tipo cadastrado'}
                    </option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                    <option value="__novo__">+ Novo tipo</option>
                  </select>
                  {novoTipoIndex === index && (
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
                        list="materiais-sugeridos-agenda"
                        value={novoTipoMaterial}
                        onChange={(e) => setNovoTipoMaterial(e.target.value)}
                        style={campo}
                      />
                      <input
                        type="text"
                        placeholder="Coloração (opcional)"
                        list="coloracoes-sugeridas-agenda"
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
                      <datalist id="materiais-sugeridos-agenda">
                        <option value="Nano Ceramic" />
                        <option value="PAP" />
                        <option value="Fumê" />
                        <option value="Espelhado" />
                        <option value="Segurança" />
                      </datalist>
                      <datalist id="coloracoes-sugeridas-agenda">
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
                  {servicoItem?.unidade === 'm2' && (
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Quantidade (m²)"
                      value={item.quantidade}
                      onChange={(e) => mudarItemQuantidade(index, formatarDecimalDigitado(e.target.value))}
                      style={campo}
                    />
                  )}
                  <CampoMoeda value={item.valor} onChange={(valor) => mudarItemValor(index, valor)} style={campo} />
                  <button
                    type="button"
                    onClick={() => removerItem(index)}
                    style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#A6332C', fontSize: 13, padding: 0, cursor: 'pointer' }}
                  >
                    Remover
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              onClick={adicionarItem}
              style={{
                padding: 10,
                borderRadius: 10,
                border: '1px dashed #D0D5DD',
                background: '#FFFFFF',
                color: '#14304D',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Adicionar item
            </button>
            {itens.length > 0 && (
              <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                Total: {formatarValor(totalItens)}
              </div>
            )}
          </div>
          <label style={rotulo}>
            Valor combinado
            <CampoMoeda
              value={itens.length > 0 ? totalItens.toFixed(2) : valorCombinado}
              onChange={setValorCombinado}
              disabled={itens.length > 0}
              style={campo}
            />
          </label>
          <label style={rotulo}>
            Data
            <input type="date" required value={data} onChange={(e) => setData(e.target.value)} style={campo} />
          </label>
          <label style={rotulo}>
            Hora
            <input type="time" required value={hora} onChange={(e) => setHora(e.target.value)} style={campo} />
          </label>
          <label style={rotulo}>
            Local
            <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} style={campo} />
          </label>
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
            {agendamentoEditando && (
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

  const dias = diasDaSemana(dataBase)
  const agendamentosDoDia = agendamentos.filter((ag) => ag.data?.slice(0, 10) === diaSelecionado)
  const concluidosDoDia = agendamentosDoDia.filter(
    (ag) => calcularStatusAgendamento(ag).label === 'Concluído'
  ).length

  function mudarSemana(delta) {
    const nova = new Date(dataBase)
    nova.setDate(nova.getDate() + delta * 7)
    setDataBase(nova)
  }

  function irParaHoje() {
    const hoje = new Date()
    setDataBase(hoje)
    setDiaSelecionado(paraISO(hoje))
  }

  function mudarMes(delta) {
    setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + delta, 1))
  }

  function selecionarDoCalendario(iso) {
    const [ano, mes, dia] = iso.split('-').map(Number)
    setDiaSelecionado(iso)
    setDataBase(new Date(ano, mes - 1, dia))
    setMostrarCalendario(false)
  }

  const diasComAgendamento = new Set(agendamentos.map((ag) => ag.data?.slice(0, 10)))

  const botaoPequeno = {
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid #3A3A3A',
    background: '#232323',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }

  const seta = {
    flexShrink: 0,
    width: 28,
    background: 'none',
    border: 'none',
    color: '#CFCFCF',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
  }

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <header style={{ background: '#171717', padding: '24px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700 }}>
            Agenda
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setMesCalendario(dataBase)
                setMostrarCalendario(true)
              }}
              aria-label="Abrir calendário"
              style={{ ...botaoPequeno, fontSize: 14 }}
            >
              📅
            </button>
            <button type="button" onClick={irParaHoje} style={botaoPequeno}>
              Hoje
            </button>
          </div>
        </div>

        <div style={{ color: '#CFCFCF', fontSize: 12, marginTop: 12 }}>
          {rotuloMes(dataBase)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <button type="button" onClick={() => mudarSemana(-1)} aria-label="Semana anterior" style={seta}>
            ‹
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            {dias.map((dia) => {
              const ativo = dia.iso === diaSelecionado
              return (
                <div
                  key={dia.iso}
                  onClick={() => setDiaSelecionado(dia.iso)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 10,
                    padding: '10px 0',
                    cursor: 'pointer',
                    background: ativo ? '#14304D' : '#232323',
                    color: ativo ? '#FFFFFF' : '#CFCFCF',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{dia.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{dia.numero}</span>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => mudarSemana(1)} aria-label="Próxima semana" style={seta}>
            ›
          </button>
        </div>
      </header>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading && <div style={{ color: '#8A8A8A' }}>Carregando...</div>}
        {!loading && agendamentosDoDia.length === 0 && (
          <div style={{ color: '#8A8A8A' }}>Nenhum agendamento neste dia.</div>
        )}
        {!loading && agendamentosDoDia.length > 0 && (
          <section>
            <div style={{ fontWeight: 700 }}>{formatarData(diaSelecionado)}</div>
            <div style={{ fontSize: 12, color: '#8A8A8A', marginTop: 2, marginBottom: 12 }}>
              {agendamentosDoDia.length} {pluralizar(agendamentosDoDia.length, 'serviço', 'serviços')} · {concluidosDoDia}{' '}
              {pluralizar(concluidosDoDia, 'concluído', 'concluídos')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {agendamentosDoDia.map((item, index) => {
                const status = calcularStatusAgendamento(item)
                const concluido = status.label === 'Concluído'
                const valorExibido = concluido ? status.os?.valor_pago : item.valor
                const servicoPelicula = [item.servico, item.tipos_pelicula?.nome, item.veiculo_modelo].filter(Boolean).join(' · ')
                return (
                  <div key={item.id ?? index} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 48, flexShrink: 0, fontWeight: 700 }}>
                      {item.hora?.slice(0, 5)}
                    </div>
                    <div
                      onClick={() => {
                        if (concluido && status.os) {
                          abrirOS?.(status.os.id, 'detalhes')
                        } else {
                          abrirEdicao(item)
                        }
                      }}
                      style={{
                        flex: 1,
                        background: '#FFFFFF',
                        border: '1px solid #E4E7EC',
                        borderLeft: `4px solid ${status.corBorda}`,
                        borderRadius: 14,
                        padding: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>
                          {item.clientes?.nome || 'Sem cliente'}
                        </span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: status.corBadgeBg,
                            color: status.corBadgeTexto,
                          }}
                        >
                          {status.icone ? `${status.icone} ` : ''}{status.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#8A8A8A' }}>
                        {servicoPelicula}
                      </div>
                      {valorExibido != null && (
                        <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                          {formatarValor(valorExibido)}
                        </div>
                      )}
                      {!concluido && status.os && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirOS?.(status.os.id, 'fechar')
                          }}
                          style={{
                            marginTop: 4,
                            alignSelf: 'flex-start',
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: '1px solid #171717',
                            background: '#FFFFFF',
                            color: '#171717',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Fechar OS
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <BotaoFlutuante
        ativa={ativa}
        onClick={() => {
          setAgendamentoEditando(null)
          limparCampos()
          setData(paraISO(new Date()))
          setMostrarForm(true)
        }}
      >
        +
      </BotaoFlutuante>

      {mostrarCalendario && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: '#171717',
            overflowY: 'auto',
            padding: '24px 20px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" style={seta}>
              ‹
            </button>
            <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>
              {rotuloMes(mesCalendario)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" style={seta}>
                ›
              </button>
              <button
                type="button"
                onClick={() => setMostrarCalendario(false)}
                aria-label="Fechar calendário"
                style={{ ...seta, fontSize: 20, marginLeft: 8 }}
              >
                ✕
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              marginTop: 20,
            }}
          >
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((rotulo) => (
              <div
                key={rotulo}
                style={{ textAlign: 'center', color: '#9A9A9A', fontSize: 11, fontWeight: 600 }}
              >
                {rotulo}
              </div>
            ))}
            {celulasDoMes(mesCalendario).map((iso, i) => {
              if (!iso) return <div key={`vazio-${i}`} />
              const ativo = iso === diaSelecionado
              return (
                <div
                  key={iso}
                  onClick={() => selecionarDoCalendario(iso)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: ativo ? '#14304D' : '#232323',
                    color: ativo ? '#FFFFFF' : '#CFCFCF',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {Number(iso.slice(8))}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: diasComAgendamento.has(iso)
                        ? ativo ? '#FFFFFF' : '#14304D'
                        : 'transparent',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Agenda
