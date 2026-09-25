import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/authContext'
import { rpc, supabase, type PlayerRole } from '@/lib/supabase'

export interface MarketplaceFilters {
  city: string
  dateFrom: string
  role: '' | PlayerRole
}

export function useMarketplace(filters: MarketplaceFilters) {
  return useQuery({
    queryKey: ['marketplace', 'list', filters],
    queryFn: () =>
      rpc('list_open_spots', {
        p_city: filters.city || undefined,
        p_date_from: filters.dateFrom || undefined,
        p_role: filters.role || undefined,
      }),
  })
}

export function useMarketplaceCities() {
  return useQuery({ queryKey: ['marketplace', 'cities'], queryFn: () => rpc('list_open_spot_cities', {}) })
}

export function usePublicPost(postId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace', 'post', postId],
    enabled: Boolean(postId),
    queryFn: async () => {
      const rows = await rpc('get_public_post', { p_post_id: postId! })
      return rows[0] ?? null
    },
  })
}

/** My registration on the session behind a post (own registrations are always readable). */
export function useMyRegistrationOnSession(sessionId: string | undefined) {
  const { userId } = useAuth()
  return useQuery({
    queryKey: ['marketplace', 'my-registration', sessionId, userId],
    enabled: Boolean(sessionId && userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('id, status, role')
        .eq('session_id', sessionId!)
        .eq('user_id', userId!)
        .in('status', ['pending', 'confirmed', 'waitlist'])
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useRegisterFromPost(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (role: PlayerRole) => rpc('register_for_session', { p_session_id: sessionId!, p_role: role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
