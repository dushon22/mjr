import { useState, useEffect } from 'react'
import { formatarValorMoeda, digitosParaValorMoeda } from '../utils/mascaras'

// Input de moeda: digita da direita para a esquerda (ex: 150000 -> R$ 1.500,00).
// `value`/`onChange` trabalham com string decimal ("1500.00" ou ""), pronta para Number().
function CampoMoeda({ value, onChange, style, placeholder = 'R$ 0,00', required, id, disabled }) {
  const [texto, setTexto] = useState(() => (value === '' || value == null ? '' : `R$ ${formatarValorMoeda(value)}`))

  useEffect(() => {
    setTexto(value === '' || value == null ? '' : `R$ ${formatarValorMoeda(value)}`)
  }, [value])

  function lidarComMudanca(e) {
    const novoValor = digitosParaValorMoeda(e.target.value)
    setTexto(novoValor === '' ? '' : `R$ ${formatarValorMoeda(novoValor)}`)
    onChange(novoValor)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={texto}
      onChange={lidarComMudanca}
      style={style}
    />
  )
}

export default CampoMoeda
