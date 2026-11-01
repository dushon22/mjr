// Mês atual no fuso de São Paulo (o fechamento é gravado em UTC).
export function mesAtualSP() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return {
    ano: Number(partes.find((p) => p.type === 'year').value),
    mes: Number(partes.find((p) => p.type === 'month').value),
  }
}

// Limites [início, fim) do mês em horário de São Paulo (UTC-3, sem horário de verão).
export function limitesDoMes({ ano, mes }) {
  const pad = (n) => String(n).padStart(2, '0')
  const proximo = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
  return {
    inicio: `${ano}-${pad(mes)}-01T00:00:00-03:00`,
    fim: `${proximo.ano}-${pad(proximo.mes)}-01T00:00:00-03:00`,
  }
}

export function rotuloMes({ ano, mes }) {
  const texto = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(' de ', ' ')
}

// Data local (YYYY-MM-DD, São Paulo) de um valor date ou timestamp.
export function dataLocalSP(valor) {
  if (!valor) return null
  if (valor.length <= 10) return valor
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(valor))
}

export function mesDeslocado({ ano, mes }, delta) {
  const d = new Date(ano, mes - 1 + delta, 1)
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

export function nomeMes({ ano, mes }) {
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
}

export function chaveMes({ ano, mes }) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}
