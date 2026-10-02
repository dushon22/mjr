import { useEffect, useState } from 'react'
import { supabase, EVENTO_DADOS_ALTERADOS } from './supabaseClient'
import Login from './Login'
import BottomNav from './BottomNav'
import Inicio from './screens/Inicio'
import Clientes from './screens/Clientes'
import Estoque from './screens/Estoque'
import Financeiro from './screens/Financeiro'
import Agenda from './screens/Agenda'
import OrdensServico from './screens/OrdensServico'
import TiposPelicula from './screens/TiposPelicula'
import Servicos from './screens/Servicos'
import './App.css'

const SCREENS = {
  inicio: Inicio,
  clientes: Clientes,
  estoque: Estoque,
  financeiro: Financeiro,
  agenda: Agenda,
  os: OrdensServico,
  tipos: TiposPelicula,
  servicos: Servicos,
}

function App() {
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('inicio')
  const [osAlvo, setOsAlvo] = useState(null) // { id, modo: 'fechar' | 'detalhes' }
  const [visitados, setVisitados] = useState(['inicio'])
  // Incrementado após escritas no banco e ao voltar ao primeiro plano; a tela ativa busca de novo.
  const [dataVersion, setDataVersion] = useState(0)

  function abrirOS(id, modo) {
    setOsAlvo({ id, modo })
    setActiveTab('os')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Agrupa escritas em sequência (ex: agendamento + itens) num único incremento.
    let timer
    function avisarMudanca() {
      clearTimeout(timer)
      timer = setTimeout(() => setDataVersion((v) => v + 1), 150)
    }
    function aoMudarVisibilidade() {
      if (document.visibilityState === 'visible') avisarMudanca()
    }
    window.addEventListener(EVENTO_DADOS_ALTERADOS, avisarMudanca)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(EVENTO_DADOS_ALTERADOS, avisarMudanca)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [])

  // Mantém as telas já visitadas montadas (só escondidas), para trocar de aba
  // sem remontar/recarregar tudo de novo a cada toque.
  useEffect(() => {
    setVisitados((atual) => (atual.includes(activeTab) ? atual : [...atual, activeTab]))
  }, [activeTab])

  if (!session) {
    return <Login />
  }

  return (
    <>
      {visitados.map((tab) => {
        const Screen = SCREENS[tab]
        return (
          <div key={tab} style={{ display: tab === activeTab ? 'contents' : 'none' }}>
            <Screen
              setActiveTab={setActiveTab}
              abrirOS={abrirOS}
              osAlvo={osAlvo}
              limparOsAlvo={() => setOsAlvo(null)}
              dataVersion={dataVersion}
              ativa={tab === activeTab}
            />
          </div>
        )
      })}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  )
}

export default App
