import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/authContext'
import { supabase } from '@/lib/supabase'

export function useMyBalances() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: ['me', 'balances', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('member_balances').select('group_id, balance_cents').eq('user_id', userId!)
      if (error) throw error
      return new Map(data.map((row) => [row.group_id!, row.balance_cents ?? 0]))
    },
  })
}

export interface HistoryEntry {
  id: string
  group_id: string
  type: string
  origin_type: string
  amount_cents: number
  note: string | null
  created_at: string
  session_starts_at: string | null
  late_cancelled: boolean
  variable_symbol: number | null
  method: string | null
}

/** My ledger with the details needed for readable descriptions. */
export function useMyLedger() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: ['me', 'ledger', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<HistoryEntry[]> => {
      const entries = await supabase
        .from('ledger_entries_classified')
        .select('id, group_id, type, origin_type, amount_cents, note, created_at, session_id, registration_id, payment_id')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(300)
      if (entries.error) throw entries.error
      const sessionIds = [...new Set(entries.data.map((e) => e.session_id).filter((id): id is string => Boolean(id)))]
      const paymentIds = [...new Set(entries.data.map((e) => e.payment_id).filter((id): id is string => Boolean(id)))]
      const registrationIds = [...new Set(entries.data.map((e) => e.registration_id).filter((id): id is string => Boolean(id)))]
      const [sessions, payments, registrations] = await Promise.all([
        sessionIds.length ? supabase.from('sessions').select('id, starts_at').in('id', sessionIds) : { data: [], error: null },
        paymentIds.length ? supabase.from('payments').select('id, variable_symbol, method').in('id', paymentIds) : { data: [], error: null },
        registrationIds.length ? supabase.from('registrations').select('id, status').in('id', registrationIds) : { data: [], error: null },
      ])
      if (sessions.error) throw sessions.error
      if (payments.error) throw payments.error
      if (registrations.error) throw registrations.error
      const sessionMap = new Map(sessions.data.map((s) => [s.id, s.starts_at]))
      const paymentMap = new Map(payments.data.map((p) => [p.id, p]))
      const registrationMap = new Map(registrations.data.map((r) => [r.id, r.status]))
      return entries.data.map((e) => ({
        id: e.id!,
        group_id: e.group_id!,
        type: e.type!,
        origin_type: e.origin_type!,
        amount_cents: e.amount_cents!,
        note: e.note,
        created_at: e.created_at!,
        session_starts_at: e.session_id ? (sessionMap.get(e.session_id) ?? null) : null,
        late_cancelled: e.registration_id ? registrationMap.get(e.registration_id) === 'late_cancelled' : false,
        variable_symbol: e.payment_id ? (paymentMap.get(e.payment_id)?.variable_symbol ?? null) : null,
        method: e.payment_id ? (paymentMap.get(e.payment_id)?.method ?? null) : null,
      }))
    },
  })
}
