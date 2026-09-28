import { useState } from 'react'
import { supabase } from './supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
    }

    setLoading(false)
  }

  const rotulo = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    color: '#9A9A9A',
    textAlign: 'left',
  }
  const campo = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #3A3A3A',
    background: '#232323',
    color: '#FFFFFF',
    fontSize: 14,
  }

  return (
    <section
      id="login"
      style={{
        minHeight: '100vh',
        background: '#171717',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ padding: '24px 20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          <span style={{ color: '#FFFFFF' }}>MJR</span>{' '}
          <span style={{ color: '#A6332C' }}>Film</span>
        </h1>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px 60px',
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <label htmlFor="email" style={rotulo}>
            E-mail
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={campo}
            />
          </label>
          <label htmlFor="password" style={rotulo}>
            Senha
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={campo}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 10,
              border: 'none',
              background: '#A6332C',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          {error && (
            <p className="error" style={{ margin: 0, color: '#E58A83', fontSize: 13, textAlign: 'center' }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

export default Login
