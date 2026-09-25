import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/database.types'
import { getLocalSupabaseEnv } from '../../../scripts/local-env.ts'

// Runs against the local Supabase stack through the real API (PostgREST), so the requests
// arrive on separate database connections at the same time.
const env = getLocalSupabaseEnv()
const PASSWORD = 'integracia-heslo-123'
const runId = Date.now().toString(36)

type Client = SupabaseClient<Database>

function newClient(key: string): Client {
  return createClient<Database>(env.apiUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function createSignedInUser(service: Client, email: string, fullName: string): Promise<Client> {
  const created = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (created.error) throw created.error
  const client = newClient(env.anonKey)
  const signedIn = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (signedIn.error) throw signedIn.error
  const profile = await client.rpc('update_my_profile', { p_full_name: fullName })
  if (profile.error) throw profile.error
  return client
}

describe('register_for_session under concurrency', () => {
  it('25 simultaneous registrations for 20 spots give exactly 20 confirmed and 5 waitlisted', async () => {
    const service = newClient(env.serviceRoleKey)
    const admin = await createSignedInUser(service, `admin-${runId}@integration.test`, 'Integračný Admin')

    const group = await admin.rpc('create_group', {
      p_name: `Súbežnosť ${runId}`,
      p_city: 'Nitra',
      p_country: 'SK',
      p_iban: 'SK3112000000198742637541',
      p_account_holder_name: 'Integračný Admin',
      p_default_venue: 'Zimný štadión',
    })
    if (group.error) throw group.error

    const players = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        createSignedInUser(service, `hrac-${i}-${runId}@integration.test`, `Hráč ${i + 1}`),
      ),
    )
    const joins = await Promise.all(
      players.map((player) => player.rpc('join_group', { p_invite_code: group.data.invite_code })),
    )
    joins.forEach((join) => expect(join.error).toBeNull())

    const sessions = await admin.rpc('create_sessions', {
      p_group_id: group.data.id,
      p_starts_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      p_skater_capacity: 20,
    })
    if (sessions.error) throw sessions.error
    const sessionId = sessions.data[0]!.id

    const results = await Promise.all(
      players.map((player) =>
        player.rpc('register_for_session', { p_session_id: sessionId, p_role: 'skater' }),
      ),
    )
    results.forEach((result) => expect(result.error).toBeNull())

    const { data: registrations, error } = await service
      .from('registrations')
      .select('user_id, status, created_at, seq')
      .eq('session_id', sessionId)
      .order('created_at')
      .order('seq')
    if (error) throw error

    expect(registrations).toHaveLength(25)
    expect(registrations.filter((r) => r.status === 'confirmed')).toHaveLength(20)
    expect(registrations.filter((r) => r.status === 'waitlist')).toHaveLength(5)
    expect(new Set(registrations.map((r) => r.user_id)).size).toBe(25)
    // The queue order is unique and the waitlisted players are the last five in it.
    expect(new Set(registrations.map((r) => `${r.created_at}|${r.seq}`)).size).toBe(25)
    expect(registrations.slice(20).every((r) => r.status === 'waitlist')).toBe(true)
  })
})
