import { execSync } from 'node:child_process'

export interface LocalSupabaseEnv {
  apiUrl: string
  anonKey: string
  serviceRoleKey: string
  mailpitUrl: string
}

// Reads URLs and keys of the running local Supabase stack (`supabase start`).
export function getLocalSupabaseEnv(): LocalSupabaseEnv {
  let raw: string
  try {
    raw = execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    throw new Error('Lokálny Supabase nebeží. Spusti `npx supabase start`.')
  }
  const data = JSON.parse(raw.slice(raw.indexOf('{'))) as Record<string, string>
  const pick = (key: string) => {
    const value = data[key]
    if (!value) throw new Error(`Chýba ${key} vo výstupe supabase status.`)
    return value
  }
  return {
    apiUrl: pick('API_URL'),
    anonKey: pick('ANON_KEY'),
    serviceRoleKey: pick('SERVICE_ROLE_KEY'),
    mailpitUrl: pick('MAILPIT_URL'),
  }
}
