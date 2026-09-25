import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { ErrorState } from '@/components/States'
import { useAuth } from '@/features/auth/authContext'
import { loginPath } from '@/features/auth/next'
import { useMyProfile } from '@/features/profile/api'

/** Signed-in users only; others go to the sign-in page and come back afterwards. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to={loginPath(location.pathname + location.search)} replace />
  return children ?? <Outlet />
}

/** Users must finish onboarding (name) before using the app. */
export function RequireProfile({ children }: { children?: ReactNode }) {
  const profile = useMyProfile()
  const location = useLocation()
  if (profile.isPending) return <FullPageSpinner />
  if (profile.isError) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      </main>
    )
  }
  if (!profile.data.profile.onboarded_at) {
    const next = location.pathname + location.search
    return <Navigate to={next === '/' ? '/vitaj' : `/vitaj?next=${encodeURIComponent(next)}`} replace />
  }
  return children ?? <Outlet />
}
