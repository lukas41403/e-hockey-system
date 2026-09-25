import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpc, supabase, type PaymentMethod } from '@/lib/supabase'

export const groupFinanceKeys = {
  all: (groupId: string) => ['group', groupId, 'finance'] as const,
  summary: (groupId: string) => ['group', groupId, 'finance', 'summary'] as const,
  payments: (groupId: string) => ['group', groupId, 'finance', 'payments'] as const,
  members: (groupId: string) => ['group', groupId, 'finance', 'members'] as const,
  sessions: (groupId: string) => ['group', groupId, 'finance', 'sessions'] as const,
}

export function useGroupFinanceSummary(groupId: string) {
  return useQuery({
    queryKey: groupFinanceKeys.summary(groupId),
    queryFn: async () => {
      const { data, error } = await supabase.from('group_finance_summary').select('*').eq('group_id', groupId).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function usePaymentsToConfirm(groupId: string) {
  return useQuery({
    queryKey: groupFinanceKeys.payments(groupId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, profile:profiles!payments_user_id_fkey(full_name)')
        .eq('group_id', groupId)
        .eq('direction', 'incoming')
        .in('status', ['pending', 'reported'])
        .order('reported_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useMemberFinance(groupId: string) {
  return useQuery({
    queryKey: groupFinanceKeys.members(groupId),
    queryFn: async () => {
      const [finance, privateData] = await Promise.all([
        supabase.from('member_finance').select('*').eq('group_id', groupId),
        supabase.from('profile_private').select('user_id, iban, phone_e164'),
      ])
      if (finance.error) throw finance.error
      if (privateData.error) throw privateData.error
      const contacts = new Map(privateData.data.map((row) => [row.user_id, row]))
      return finance.data.map((row) => ({
        userId: row.user_id!,
        role: row.role!,
        sessionsCount: row.sessions_count ?? 0,
        paidCents: row.paid_cents ?? 0,
        chargedCents: row.charged_cents ?? 0,
        goalieEarnedCents: row.goalie_earned_cents ?? 0,
        goaliePaidOutCents: row.goalie_paid_out_cents ?? 0,
        balanceCents: row.balance_cents ?? 0,
        iban: contacts.get(row.user_id!)?.iban ?? null,
        phone: contacts.get(row.user_id!)?.phone_e164 ?? null,
      }))
    },
  })
}

export type MemberFinanceRow = NonNullable<ReturnType<typeof useMemberFinance>['data']>[number]

export function useSessionResults(groupId: string) {
  return useQuery({
    queryKey: groupFinanceKeys.sessions(groupId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_summaries')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'completed')
        .order('starts_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function useInvalidateGroupMoney(groupId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: groupFinanceKeys.all(groupId) })
    void queryClient.invalidateQueries({ queryKey: ['me'] })
  }
}

export function useGroupMoneyActions(groupId: string) {
  const onSuccess = useInvalidateGroupMoney(groupId)
  return {
    confirm: useMutation({ mutationFn: (paymentId: string) => rpc('confirm_payment', { p_payment_id: paymentId }), onSuccess }),
    reject: useMutation({ mutationFn: (paymentId: string) => rpc('reject_payment', { p_payment_id: paymentId }), onSuccess }),
    cash: useMutation({
      mutationFn: (input: { userId: string; amountCents: number; note: string | null }) =>
        rpc('record_cash_payment', {
          p_group_id: groupId,
          p_user_id: input.userId,
          p_amount_cents: input.amountCents,
          p_note: input.note ?? undefined,
        }),
      onSuccess,
    }),
    adjustment: useMutation({
      mutationFn: (input: { userId: string; amountCents: number; note: string }) =>
        rpc('add_adjustment', { p_group_id: groupId, p_user_id: input.userId, p_amount_cents: input.amountCents, p_note: input.note }),
      onSuccess,
    }),
    createPayout: useMutation({
      mutationFn: (input: { userId: string; amountCents: number; method: PaymentMethod }) =>
        rpc('create_goalie_payout', {
          p_group_id: groupId,
          p_user_id: input.userId,
          p_amount_cents: input.amountCents,
          p_method: input.method,
        }),
      onSuccess,
    }),
    confirmPayout: useMutation({ mutationFn: (paymentId: string) => rpc('confirm_goalie_payout', { p_payment_id: paymentId }), onSuccess }),
    cancelPayout: useMutation({ mutationFn: (paymentId: string) => rpc('cancel_payment', { p_payment_id: paymentId }), onSuccess }),
  }
}
