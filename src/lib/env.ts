function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Chýba premenná prostredia ${name}. Pozri .env.example.`)
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
}

/** Public base URL used in share links. */
export function appUrl(path = ''): string {
  const base = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')
  return `${base}${path}`
}
