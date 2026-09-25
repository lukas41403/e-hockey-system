import { useOutletContext } from 'react-router'
import { appUrl } from '@/lib/env'
import type { Group, MemberRole } from '@/lib/supabase'

export interface GroupContext {
  group: Group
  role: MemberRole
  isAdmin: boolean
}

export function useGroupContext(): GroupContext {
  return useOutletContext<GroupContext>()
}

export function inviteUrl(code: string): string {
  return appUrl(`/pozvanka/${code}`)
}
