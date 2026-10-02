import { useState } from 'react'
import { supabase } from './supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

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
    fontSize: 13,
    fontWeight: 600,
    color: '#4A4A4A',
    textAlign: 'left',
  }
  const campo = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #D0D5DD',
    background: '#FFFFFF',
    color: '#1A1A1A',
    fontSize: 16,
  }

  return (
    <section
      id="login"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: '#171717',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: 'calc(env(safe-area-inset-top) + 24px) calc(env(safe-area-inset-right) + 20px) calc(env(safe-area-inset-bottom) + 24px) calc(env(safe-area-inset-left) + 20px)',
      }}
    >
      <style>{'@keyframes login-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }'}</style>
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          margin: 'auto 0',
          animation: 'login-fade-in 0.4s ease-out both',
        }}
      >
        <img
          src="/icon-512.png"
          alt="MJR Film"
          width={140}
          height={140}
          style={{
            width: 140,
            height: 140,
            borderRadius: 28,
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'block',
          }}
        />
        <p style={{ margin: '16px 0 28px', color: '#CFCFCF', fontSize: 14, textAlign: 'center' }}>
          Insulfilm automotivo e arquitetônico
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
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
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={campo}
            />
          </label>
          <label htmlFor="password" style={rotulo}>
            Senha
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                style={{ ...campo, paddingRight: 72 }}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((atual) => !atual)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: '100%',
                  padding: '0 12px',
                  background: 'none',
                  border: 'none',
                  color: '#14304D',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {mostrarSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>
          {error && (
            <p
              className="error"
              role="alert"
              style={{
                margin: 0,
                padding: '10px 12px',
                borderRadius: 10,
                background: '#FCF3F1',
                border: '1px solid #F2C6C1',
                color: '#A6332C',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 10,
              border: 'none',
              background: '#14304D',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default Login
