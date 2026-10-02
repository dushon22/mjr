import { createPortal } from 'react-dom'

// Botão "+" fixo, renderizado direto em document.body (fora dos wrappers das telas),
// para o position: fixed ficar sempre relativo à viewport. Só aparece na tela ativa.
function BotaoFlutuante({ ativa, onClick, children }) {
  if (!ativa) return null
  return createPortal(
    <button type="button" onClick={onClick} className="fab">
      {children}
    </button>,
    document.body,
  )
}

export default BotaoFlutuante
