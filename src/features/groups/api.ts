import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/authContext'
import { rpc, supabase, type Group, type MemberRole, type Profile } from '@/lib/supabase'

export interface MyGroup {
  role: MemberRole
  group: Group
}

export function useMyGroups() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: ['me', 'groups', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyGroup[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('role, group:groups(*)')
        .eq('user_id', userId!)
      if (error) throw error
      return data
        .filter((row): row is MyGroup => row.group !== null)
        .sort((a, b) => a.group.name.localeCompare(b.group.name, 'sk'))
    },
  })
}

/** The group with my role in it; null while loading or when I am not a member. */
export function useMyGroup(groupId: string | undefined) {
  const groups = useMyGroups()
  const entry = groups.data?.find((g) => g.group.id === groupId) ?? null
  return { ...groups, entry, isAdmin: entry?.role === 'admin' }
}

export interface Member {
  user_id: string
  role: MemberRole
  joined_at: string
  profile: Pick<Profile, 'id' | 'full_name' | 'nickname' | 'jersey_number' | 'preferred_role'> | null
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId, 'members'],
    enabled: Boolean(groupId),
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, role, joined_at, profile:profiles(id, full_name, nickname, jersey_number, preferred_role)')
        .eq('group_id', groupId!)
      if (error) throw error
      const order: Record<MemberRole, number> = { admin: 0, member: 1, guest: 2 }
      return data.sort(
        (a, b) =>
          order[a.role] - order[b.role] ||
          (a.profile?.full_name ?? '').localeCompare(b.profile?.full_name ?? '', 'sk'),
      )
    },
  })
}

/** Phones of members, readable by admins only (RLS). */
export function useMemberPhones(groupId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['group', groupId, 'phones'],
    enabled: Boolean(groupId) && enabled,
    queryFn: async (): Promise<Map<string, { phone: string | null; iban: string | null }>> => {
      const members = await supabase.from('group_members').select('user_id').eq('group_id', groupId!)
      if (members.error) throw members.error
      const { data, error } = await supabase
        .from('profile_private')
        .select('user_id, phone_e164, iban')
        .in('user_id', members.data.map((m) => m.user_id))
      if (error) throw error
      return new Map(data.map((row) => [row.user_id, { phone: row.phone_e164, iban: row.iban }]))
    },
  })
}

export function useAdminContacts(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId, 'admin-contacts'],
    enabled: Boolean(groupId),
    queryFn: () => rpc('get_group_admin_contacts', { p_group_id: groupId! }),
  })
}

export interface GroupSettingsInput {
  name: string
  city: string
  country: 'SK' | 'CZ'
  iban: string
  accountHolderName: string
  whatsappInviteUrl: string | null
  defaultVenue: string
  defaultDurationMinutes: number
  defaultSkaterCapacity: number
  defaultGoalieSlots: number
  defaultIceCostCents: number
  defaultGoalieFeeCents: number
  defaultPricingMode: 'fixed' | 'dynamic'
  defaultPricePerSkaterCents: number | null
  cancellationHours: number
  roundingStepCents?: number
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GroupSettingsInput) =>
      rpc('create_group', {
        p_name: input.name,
        p_city: input.city,
        p_country: input.country,
        p_iban: input.iban,
        p_account_holder_name: input.accountHolderName,
        p_whatsapp_invite_url: input.whatsappInviteUrl ?? undefined,
        p_default_venue: input.defaultVenue,
        p_default_duration_minutes: input.defaultDurationMinutes,
        p_default_skater_capacity: input.defaultSkaterCapacity,
        p_default_goalie_slots: input.defaultGoalieSlots,
        p_default_ice_cost_cents: input.defaultIceCostCents,
        p_default_goalie_fee_cents: input.defaultGoalieFeeCents,
        p_default_pricing_mode: input.defaultPricingMode,
        p_default_price_per_skater_cents: input.defaultPricePerSkaterCents ?? undefined,
        p_cancellation_hours: input.cancellationHours,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'groups'] }),
  })
}

export function useUpdateGroupSettings(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GroupSettingsInput & { roundingStepCents: number }) =>
      rpc('update_group_settings', {
        p_group_id: groupId,
        p_name: input.name,
        p_city: input.city,
        p_country: input.country,
        p_iban: input.iban,
        p_account_holder_name: input.accountHolderName,
        p_whatsapp_invite_url: input.whatsappInviteUrl ?? '',
        p_default_venue: input.defaultVenue,
        p_default_duration_minutes: input.defaultDurationMinutes,
        p_default_skater_capacity: input.defaultSkaterCapacity,
        p_default_goalie_slots: input.defaultGoalieSlots,
        p_default_ice_cost_cents: input.defaultIceCostCents,
        p_default_goalie_fee_cents: input.defaultGoalieFeeCents,
        p_default_pricing_mode: input.defaultPricingMode,
        p_default_price_per_skater_cents: input.defaultPricePerSkaterCents ?? 0,
        p_rounding_step_cents: input.roundingStepCents,
        p_cancellation_hours: input.cancellationHours,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'groups'] }),
  })
}

export function useRegenerateInviteCode(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => rpc('regenerate_invite_code', { p_group_id: groupId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'groups'] }),
  })
}

export function useSetMemberRole(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; role: MemberRole }) =>
      rpc('set_member_role', { p_group_id: groupId, p_user_id: input.userId, p_role: input.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['me', 'groups'] })
    },
  })
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => rpc('remove_member', { p_group_id: groupId, p_user_id: userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
  })
}

export function useInvitePreview(code: string | undefined) {
  return useQuery({
    queryKey: ['invite', code],
    enabled: Boolean(code),
    queryFn: async () => {
      const rows = await rpc('get_invite_preview', { p_invite_code: code! })
      return rows[0] ?? null
    },
  })
}

export function useJoinGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => rpc('join_group', { p_invite_code: code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}
