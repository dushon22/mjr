// Flags para ocultar/reativar módulos sem apagar código nem dados.
// Para reativar um módulo, troque o valor para true.
export const FEATURES = {
  agenda: false,
  os: false,
  estoque: false, // inclui as telas de tipos de película e serviços
}

// Abas que dependem de cada flag.
const ABA_FEATURE = {
  agenda: 'agenda',
  os: 'os',
  estoque: 'estoque',
  tipos: 'estoque',
  servicos: 'estoque',
}

export function abaHabilitada(aba) {
  const flag = ABA_FEATURE[aba]
  return flag ? FEATURES[flag] : true
}
