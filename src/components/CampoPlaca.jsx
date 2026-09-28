import { formatarPlaca, placaParaSalvar } from '../utils/mascaras'

// Input de placa: maiúsculas automáticas, aceita formato antigo (ABC-1234) e Mercosul (ABC1D23).
// `value`/`onChange` trabalham com o valor limpo (sem hífen, maiúsculo, até 7 caracteres).
function CampoPlaca({ value, onChange, style, placeholder = 'ABC-1234', required, id, disabled }) {
  return (
    <input
      id={id}
      type="text"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={formatarPlaca(value || '')}
      onChange={(e) => onChange(placaParaSalvar(e.target.value))}
      style={{ ...style, textTransform: 'uppercase' }}
      maxLength={8}
    />
  )
}

export default CampoPlaca
