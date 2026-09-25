import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/authContext'
import { useMyProfile } from '@/features/profile/api'
import type { RosterRegistration, SessionWithRoster } from '@/features/sessions/model'
import { predictedStatus, viewSession } from '@/features/sessions/model'
import { rpc, supabase, type PlayerRole } from '@/lib/supabase'

const SESSION_SELECT =
  '*, group:groups(id, name, currency, country, city, whatsapp_invite_url), registrations(*, profile:profiles!registrations_user_id_fkey(id, full_name, nickname, jersey_number))'

export const sessionKeys = {
  all: ['sessions'] as const,
  upcoming: (userId: string | null) => ['sessions', 'upcoming', userId] as const,
  group: (groupId: string) => ['sessions', 'group', groupId] as const,
  detail: (sessionId: string) => ['sessions', 'detail', sessionId] as const,
}

/** Upcoming (and currently running) sessions of all my groups, with rosters. */
export function useUpcomingSessions() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: sessionKeys.upcoming(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<SessionWithRoster[]> => {
      const since = new Date(Date.now() - 4 * 3600_000).toISOString()
      const { data, error } = await supabase
        .from('sessions')
        .select(SESSION_SELECT)
        .gte('starts_at', since)
        .eq('status', 'scheduled')
        .order('starts_at')
        .limit(40)
      if (error) throw error
      return data as SessionWithRoster[]
    },
  })
}

export function useGroupSessions(groupId: string) {
  return useQuery({
    queryKey: sessionKeys.group(groupId),
    queryFn: async (): Promise<SessionWithRoster[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(SESSION_SELECT)
        .eq('group_id', groupId)
        .order('starts_at', { ascending: false })
        .limit(60)
      if (error) throw error
      return data as SessionWithRoster[]
    },
  })
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ''),
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<SessionWithRoster | null> => {
      const { data, error } = await supabase.from('sessions').select(SESSION_SELECT).eq('id', sessionId!).maybeSingle()
      if (error) throw error
      return data as SessionWithRoster | null
    },
  })
}

/** Refetches the given queries when rows of the watched tables change (RLS applies to events). */
export function useRealtimeRefresh(channelName: string, tables: { table: 'registrations' | 'sessions' | 'payments'; filter?: string }[], keys: QueryKey[]) {
  const queryClient = useQueryClient()
  const signature = JSON.stringify(tables)
  const keySignature = JSON.stringify(keys)

  useEffect(() => {
    let timer: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        for (const key of JSON.parse(keySignature) as QueryKey[]) void queryClient.invalidateQueries({ queryKey: key })
      }, 150)
    }
    const channel = supabase.channel(`${channelName}:${Math.random().toString(36).slice(2)}`)
    for (const { table, filter } of JSON.parse(signature) as typeof tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, refresh)
    }
    channel.subscribe()
    return () => {
      window.clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [channelName, signature, keySignature, queryClient])
}

function useInvalidateSessions() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['me', 'balances'] })
  }
}

type SessionCache = SessionWithRoster | SessionWithRoster[] | null | undefined

/** Applies a change to the session in every cached session query (detail and lists). */
function patchSessionCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string,
  patch: (session: SessionWithRoster) => SessionWithRoster,
) {
  const snapshot = queryClient.getQueriesData<SessionCache>({ queryKey: sessionKeys.all })
  queryClient.setQueriesData<SessionCache>({ queryKey: sessionKeys.all }, (data) => {
    if (!data) return data
    if (Array.isArray(data)) return data.map((s) => (s.id === sessionId ? patch(s) : s))
    return data.id === sessionId ? patch(data) : data
  })
  return () => {
    for (const [key, data] of snapshot) queryClient.setQueryData(key, data)
  }
}

function findCachedSession(queryClient: ReturnType<typeof useQueryClient>, sessionId: string): SessionWithRoster | null {
  for (const [, data] of queryClient.getQueriesData<SessionCache>({ queryKey: sessionKeys.all })) {
    const found = Array.isArray(data) ? data.find((s) => s.id === sessionId) : data?.id === sessionId ? data : null
    if (found) return found
  }
  return null
}

/** Registers me; rosters update immediately and roll back if the server refuses. */
export function useRegister(sessionId: string) {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const profile = useMyProfile()
  const invalidate = useInvalidateSessions()

  return useMutation({
    mutationFn: (role: PlayerRole) => rpc('register_for_session', { p_session_id: sessionId, p_role: role }),
    onMutate: async (role) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.all })
      const cached = findCachedSession(queryClient, sessionId)
      if (!cached || !userId) return { rollback: () => undefined }
      const status = predictedStatus(cached, viewSession(cached, userId), role)
      const now = new Date().toISOString()
      const optimistic: RosterRegistration = {
        id: `optimistic-${now}`,
        seq: Number.MAX_SAFE_INTEGER,
        session_id: sessionId,
        group_id: cached.group_id,
        user_id: userId,
        role,
        status,
        is_guest: false,
        attended: null,
        promoted_at: null,
        promotion_seen_at: null,
        cancel_reason: null,
        created_at: now,
        cancelled_at: null,
        updated_at: now,
        created_by: userId,
        profile: profile.data
          ? {
              id: userId,
              full_name: profile.data.profile.full_name,
              nickname: profile.data.profile.nickname,
              jersey_number: profile.data.profile.jersey_number,
            }
          : null,
      }
      const rollback = patchSessionCaches(queryClient, sessionId, (s) => ({ ...s, registrations: [...s.registrations, optimistic] }))
      return { rollback }
    },
    onError: (_error, _role, context) => context?.rollback(),
    onSettled: invalidate,
  })
}

export function useCancelRegistration(sessionId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateSessions()

  return useMutation({
    mutationFn: (registrationId: string) => rpc('cancel_registration', { p_registration_id: registrationId }),
    onMutate: async (registrationId) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.all })
      const rollback = patchSessionCaches(queryClient, sessionId, (s) => ({
        ...s,
        registrations: s.registrations.map((r) =>
          r.id === registrationId ? { ...r, status: 'cancelled', cancel_reason: 'self', cancelled_at: new Date().toISOString() } : r,
        ),
      }))
      return { rollback }
    },
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: invalidate,
  })
}

export function useMarkPromotionSeen() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (registrationId: string) => rpc('mark_promotion_seen', { p_registration_id: registrationId }),
    onSettled: invalidate,
  })
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface SessionInput {
  startsAt: string
  durationMinutes: number
  venue: string
  skaterCapacity: number
  goalieSlots: number
  iceCostCents: number
  goalieFeeCents: number
  pricingMode: 'fixed' | 'dynamic'
  pricePerSkaterCents: number | null
  roundingStepCents: number
  cancellationHours: number
  notes: string | null
}

export function useCreateSessions(groupId: string) {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (input: SessionInput & { repeatWeeks: number }) =>
      rpc('create_sessions', {
        p_group_id: groupId,
        p_starts_at: input.startsAt,
        p_duration_minutes: input.durationMinutes,
        p_venue: input.venue,
        p_skater_capacity: input.skaterCapacity,
        p_goalie_slots: input.goalieSlots,
        p_ice_cost_cents: input.iceCostCents,
        p_goalie_fee_cents: input.goalieFeeCents,
        p_pricing_mode: input.pricingMode,
        p_price_per_skater_cents: input.pricePerSkaterCents ?? undefined,
        p_rounding_step_cents: input.roundingStepCents,
        p_cancellation_hours: input.cancellationHours,
        p_notes: input.notes ?? undefined,
        p_repeat_weeks: input.repeatWeeks,
      }),
    onSuccess: invalidate,
  })
}

export function useUpdateSession(sessionId: string) {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (input: SessionInput) =>
      rpc('update_session', {
        p_session_id: sessionId,
        p_starts_at: input.startsAt,
        p_duration_minutes: input.durationMinutes,
        p_venue: input.venue,
        p_skater_capacity: input.skaterCapacity,
        p_goalie_slots: input.goalieSlots,
        p_ice_cost_cents: input.iceCostCents,
        p_goalie_fee_cents: input.goalieFeeCents,
        p_pricing_mode: input.pricingMode,
        p_price_per_skater_cents: input.pricePerSkaterCents ?? 0,
        p_rounding_step_cents: input.roundingStepCents,
        p_cancellation_hours: input.cancellationHours,
        p_notes: input.notes ?? '',
      }),
    onSuccess: invalidate,
  })
}

export function useSessionAdminActions(sessionId: string) {
  const invalidate = useInvalidateSessions()
  const queryClient = useQueryClient()
  const onSuccess = () => {
    invalidate()
    void queryClient.invalidateQueries({ queryKey: ['group'] })
    void queryClient.invalidateQueries({ queryKey: ['marketplace'] })
  }
  return {
    addPlayer: useMutation({
      mutationFn: (input: { userId: string; role: PlayerRole }) =>
        rpc('register_for_session', { p_session_id: sessionId, p_role: input.role, p_user_id: input.userId }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (registrationId: string) => rpc('remove_registration', { p_registration_id: registrationId }),
      onSuccess,
    }),
    approve: useMutation({
      mutationFn: (registrationId: string) => rpc('approve_registration', { p_registration_id: registrationId }),
      onSuccess,
    }),
    reject: useMutation({
      mutationFn: (registrationId: string) => rpc('reject_registration', { p_registration_id: registrationId }),
      onSuccess,
    }),
    cancelSession: useMutation({
      mutationFn: () => rpc('cancel_session', { p_session_id: sessionId }),
      onSuccess,
    }),
    finalize: useMutation({
      mutationFn: (attendance: Record<string, boolean>) =>
        rpc('finalize_session', { p_session_id: sessionId, p_attendance: attendance }),
      onSuccess,
    }),
    reopen: useMutation({
      mutationFn: () => rpc('reopen_session', { p_session_id: sessionId }),
      onSuccess,
    }),
    publish: useMutation({
      mutationFn: (input: { offerSkaters: boolean; offerGoalies: boolean; requireApproval: boolean; note: string | null }) =>
        rpc('publish_open_spots', {
          p_session_id: sessionId,
          p_offer_skaters: input.offerSkaters,
          p_offer_goalies: input.offerGoalies,
          p_require_approval: input.requireApproval,
          p_note: input.note ?? undefined,
        }),
      onSuccess,
    }),
    unpublish: useMutation({
      mutationFn: () => rpc('unpublish_open_spots', { p_session_id: sessionId }),
      onSuccess,
    }),
  }
}

export function useActivePost(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['marketplace', 'session-post', sessionId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_spot_posts')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
