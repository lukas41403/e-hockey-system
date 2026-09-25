import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface AuthContextValue {
  session: Session | null
  userId: string | null
  email: string | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue>({ session: null, userId: null, email: null, loading: true })

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
