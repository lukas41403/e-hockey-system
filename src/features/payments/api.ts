import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/authContext'
import { rpc, supabase } from '@/lib/supabase'

export function useMyOpenPayments() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: ['me', 'payments', 'open', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId!)
        .eq('direction', 'incoming')
        .in('status', ['pending', 'reported'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function useInvalidateMoney() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['me'] })
    void queryClient.invalidateQueries({ queryKey: ['group'] })
  }
}

export function useCreatePaymentRequest() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (input: { groupId: string; amountCents: number }) =>
      rpc('create_payment_request', { p_group_id: input.groupId, p_amount_cents: input.amountCents }),
    onSuccess: invalidate,
  })
}

export function useReportPayment() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (paymentId: string) => rpc('report_payment', { p_payment_id: paymentId }),
    onSuccess: invalidate,
  })
}

export function useCancelPayment() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (paymentId: string) => rpc('cancel_payment', { p_payment_id: paymentId }),
    onSuccess: invalidate,
  })
}
