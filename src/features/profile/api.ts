import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/authContext'
import { rpc, supabase, type Profile, type ProfilePrivate } from '@/lib/supabase'

export interface MyProfile {
  profile: Profile
  private: ProfilePrivate | null
}

export function useMyProfile() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: ['me', 'profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyProfile> => {
      const [profile, privateData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId!).single(),
        supabase.from('profile_private').select('*').eq('user_id', userId!).maybeSingle(),
      ])
      if (profile.error) throw profile.error
      if (privateData.error) throw privateData.error
      return { profile: profile.data, private: privateData.data }
    },
  })
}

export interface ProfileInput {
  fullName: string
  nickname: string | null
  jerseyNumber: number | null
  preferredRole: 'skater' | 'goalie'
  phoneE164: string | null
  iban: string | null
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) =>
      rpc('update_my_profile', {
        p_full_name: input.fullName,
        p_nickname: input.nickname ?? undefined,
        p_jersey_number: input.jerseyNumber ?? undefined,
        p_preferred_role: input.preferredRole,
        p_phone_e164: input.phoneE164 ?? undefined,
        p_iban: input.iban ?? undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}

/** "Martin Kováč" -> "MK"; used on rink slots when there is no jersey number. */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/** Name shown in lists: nickname in quotes when set. */
export function displayName(profile: Pick<Profile, 'full_name' | 'nickname'> | null | undefined): string {
  if (!profile) return ''
  return profile.nickname ? `${profile.full_name} (${profile.nickname})` : profile.full_name
}
