import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Disparado após qualquer escrita bem-sucedida no banco (insert, update, delete, rpc),
// para o App avisar as telas que precisam buscar os dados de novo.
export const EVENTO_DADOS_ALTERADOS = 'dados-alterados'

async function fetchComAviso(input, init) {
  const resposta = await fetch(input, init)
  const metodo = (init?.method ?? input?.method ?? 'GET').toUpperCase()
  const url = String(input?.url ?? input)
  if (resposta.ok && metodo !== 'GET' && metodo !== 'HEAD' && url.includes('/rest/v1/')) {
    window.dispatchEvent(new Event(EVENTO_DADOS_ALTERADOS))
  }
  return resposta
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchComAviso },
})
