import { useState } from 'react'

const OPCAO_NOVO = '__novo__'

// Select com opções fixas + opção final "+ Novo ..." que troca o select por um input de texto
// (com botão para voltar à lista). `value`/`onChange` trabalham com o texto do valor.
function CampoSelectComNovo({ label, value, onChange, opcoes, textoNovo, placeholderNovo, required, style, labelStyle }) {
  const [digitando, setDigitando] = useState(false)

  if (digitando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={labelStyle}>
          {label}
          <input
            type="text"
            required={required}
            autoFocus
            placeholder={placeholderNovo}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={style}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setDigitando(false)
            onChange('')
          }}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: '#4A4A4A', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Voltar para a lista
        </button>
      </div>
    )
  }

  return (
    <label style={labelStyle}>
      {label}
      <select
        required={required}
        value={value}
        onChange={(e) => {
          if (e.target.value === OPCAO_NOVO) {
            setDigitando(true)
            onChange('')
          } else {
            onChange(e.target.value)
          }
        }}
        style={style}
      >
        <option value="">Selecione</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value={OPCAO_NOVO}>{textoNovo}</option>
      </select>
    </label>
  )
}

export default CampoSelectComNovo
