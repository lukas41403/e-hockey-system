import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { RinkMark } from '@/components/rink/RinkMark'
import { safeNextPath } from '@/features/auth/next'
import { ProfileForm } from '@/features/profile/ProfileForm'
import { useMyProfile, useUpdateProfile } from '@/features/profile/api'
import { copy } from '@/lib/copy'

export function OnboardingPage() {
  const profile = useMyProfile()
  const update = useUpdateProfile()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))

  if (profile.isPending) return <FullPageSpinner />
  if (profile.data?.profile.onboarded_at && !update.isSuccess) return <Navigate to={next} replace />

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <RinkMark className="mb-6 size-10" />
      <h1 className="font-display text-display">{copy.onboarding.title}</h1>
      <p className="mt-2 mb-6 text-base text-muted-foreground">{copy.onboarding.intro}</p>
      <ProfileForm
        initial={profile.data}
        submitLabel={copy.onboarding.submit}
        busy={update.isPending}
        onSubmit={(input) => update.mutate(input, { onSuccess: () => navigate(next, { replace: true }) })}
      />
    </main>
  )
}
