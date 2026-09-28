import { formatarTelefone, telefoneParaSalvar } from '../utils/mascaras'

// Input de telefone: (19) 99999-9999 (celular) ou (19) 9999-9999 (fixo/antigo).
// `value`/`onChange` trabalham só com dígitos.
function CampoTelefone({ value, onChange, style, placeholder = '(19) 99999-9999', required, id, disabled }) {
  return (
    <input
      id={id}
      type="tel"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={formatarTelefone(value || '')}
      onChange={(e) => onChange(telefoneParaSalvar(e.target.value))}
      style={style}
    />
  )
}

export default CampoTelefone
