import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { env } from '@/lib/env'

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storageKey: 'particka-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
export type Functions = PublicSchema['Functions']

export type Profile = Tables<'profiles'>
export type ProfilePrivate = Tables<'profile_private'>
export type Group = Tables<'groups'>
export type GroupMember = Tables<'group_members'>
export type Session = Tables<'sessions'>
export type Registration = Tables<'registrations'>
export type Payment = Tables<'payments'>
export type LedgerEntry = Tables<'ledger_entries'>
export type OpenSpotPost = Tables<'open_spot_posts'>
export type MemberRole = Enums<'member_role'>
export type PlayerRole = Enums<'player_role'>
export type RegistrationStatus = Enums<'registration_status'>
export type Currency = Enums<'currency_code'>
export type PaymentMethod = Enums<'payment_method'>

/** Calls a database function and throws its error, so TanStack Query sees failures. */
export async function rpc<Fn extends keyof Functions>(
  fn: Fn,
  args: Functions[Fn]['Args'],
): Promise<Functions[Fn]['Returns']> {
  const { data, error } = await supabase.rpc(fn, args as never)
  if (error) throw error
  return data as Functions[Fn]['Returns']
}
