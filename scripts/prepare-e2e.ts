// Before e2e tests: fresh seed data and a matching .env.local for the production build.
import { execSync } from 'node:child_process'
import './write-env-local.ts'

execSync('npx supabase db reset', { stdio: 'inherit' })
