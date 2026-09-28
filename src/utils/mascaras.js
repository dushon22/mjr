// Moeda (R$): formata um valor numérico (ou string decimal) para exibição pt-BR.
export function formatarValorMoeda(valorNumerico) {
  if (valorNumerico === '' || valorNumerico == null || Number.isNaN(Number(valorNumerico))) return ''
  return Number(valorNumerico).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Converte o texto digitado (dígitos "da direita para a esquerda") em uma string decimal ("1500.00").
export function digitosParaValorMoeda(textoDigitado) {
  const digitos = (textoDigitado || '').replace(/\D/g, '')
  if (!digitos) return ''
  return (Number(digitos) / 100).toFixed(2)
}

// Placa: maiúsculas, só alfanumérico, máx. 7 caracteres, hífen após os 3 primeiros.
// Aceita tanto o formato antigo (ABC1234) quanto Mercosul (ABC1D23) como entrada.
export function formatarPlaca(valorLimpo) {
  const limpo = (valorLimpo || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  if (limpo.length <= 3) return limpo
  return `${limpo.slice(0, 3)}-${limpo.slice(3)}`
}

// Valor a salvar: maiúsculas, sem hífen, máx. 7 caracteres.
export function placaParaSalvar(textoDigitado) {
  return (textoDigitado || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

// Telefone: (19) 99999-9999 (celular) ou (19) 9999-9999 (fixo/antigo).
export function formatarTelefone(valorLimpo) {
  const digitos = (valorLimpo || '').replace(/\D/g, '').slice(0, 11)
  if (digitos.length === 0) return ''
  if (digitos.length <= 2) return `(${digitos}`
  const ddd = digitos.slice(0, 2)
  const resto = digitos.slice(2)
  if (resto.length === 0) return `(${ddd}) `
  if (digitos.length <= 10) {
    if (resto.length <= 4) return `(${ddd}) ${resto}`
    return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`
  }
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
}

// Valor a salvar: só números.
export function telefoneParaSalvar(textoDigitado) {
  return (textoDigitado || '').replace(/\D/g, '').slice(0, 11)
}

// Metros/largura: aceita vírgula como separador decimal durante a digitação.
export function formatarDecimalDigitado(texto) {
  let limpo = (texto || '').replace(/[^\d,]/g, '')
  const partes = limpo.split(',')
  if (partes.length > 2) {
    limpo = partes[0] + ',' + partes.slice(1).join('')
  }
  return limpo
}

// Converte "1,52" (ou "1.52") em string decimal pronta para Number().
export function virgulaParaNumero(texto) {
  if (texto === '' || texto == null) return ''
  return String(texto).replace(',', '.')
}
