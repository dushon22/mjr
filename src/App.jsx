import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
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

  if (!session) {
    return <Login />
  }

  const ActiveScreen = SCREENS[activeTab]

  return (
    <>
      <div key={activeTab} className="screen-transition">
        <ActiveScreen
          setActiveTab={setActiveTab}
          abrirOS={abrirOS}
          osAlvo={osAlvo}
          limparOsAlvo={() => setOsAlvo(null)}
        />
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  )
}

export default App
