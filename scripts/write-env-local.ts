// Writes .env.local for the local Supabase stack so `npm run dev` works right after `supabase start`.
import { writeFileSync } from 'node:fs'
import { getLocalSupabaseEnv } from './local-env.ts'

const env = getLocalSupabaseEnv()
const content = [
  `VITE_SUPABASE_URL=${env.apiUrl}`,
  `VITE_SUPABASE_ANON_KEY=${env.anonKey}`,
  'VITE_APP_URL=http://localhost:5173',
  '',
].join('\n')
writeFileSync(new URL('../.env.local', import.meta.url), content)
console.log('.env.local zapísaný pre lokálny Supabase.')
