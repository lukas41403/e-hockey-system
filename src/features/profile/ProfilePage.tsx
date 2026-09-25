import { Link } from 'react-router'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, SectionTitle } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ErrorState } from '@/components/States'
import { useTheme, type ThemePreference } from '@/app/theme'
import { useAuth } from '@/features/auth/authContext'
import { ProfileForm } from '@/features/profile/ProfileForm'
import { useMyProfile, useUpdateProfile } from '@/features/profile/api'
import { copy } from '@/lib/copy'
import { supabase } from '@/lib/supabase'

export function ProfilePage() {
  const profile = useMyProfile()
  const update = useUpdateProfile()
  const { email } = useAuth()
  const { preference, setPreference } = useTheme()

  return (
    <div className="max-w-xl">
      <PageHeader title={copy.profile.title} subtitle={email ? copy.profile.signedInAs(email) : undefined} />
      {profile.isPending ? (
        <div className="flex flex-col gap-5" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[4.25rem]" />
          ))}
        </div>
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <ProfileForm
          key={profile.data.profile.updated_at}
          initial={profile.data}
          submitLabel={copy.profile.save}
          busy={update.isPending}
          onSubmit={(input) => update.mutate(input, { onSuccess: () => toast.success(copy.profile.saved) })}
        />
      )}

      <SectionTitle id="theme-title">{copy.profile.theme}</SectionTitle>
      <ToggleGroup
        type="single"
        value={preference}
        onValueChange={(value) => value && setPreference(value as ThemePreference)}
        aria-labelledby="theme-title"
      >
        <ToggleGroupItem value="system">
          <Monitor aria-hidden="true" />
          {copy.profile.themeSystem}
        </ToggleGroupItem>
        <ToggleGroupItem value="light">
          <Sun aria-hidden="true" />
          {copy.profile.themeLight}
        </ToggleGroupItem>
        <ToggleGroupItem value="dark">
          <Moon aria-hidden="true" />
          {copy.profile.themeDark}
        </ToggleGroupItem>
      </ToggleGroup>

      <SectionTitle>{copy.profile.account}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {profile.data?.profile.is_superadmin && (
          <Button variant="secondary" asChild>
            <Link to="/admin">{copy.profile.superadmin}</Link>
          </Button>
        )}
        <Button variant="destructive-outline" onClick={() => supabase.auth.signOut()}>
          <LogOut aria-hidden="true" />
          {copy.auth.signOut}
        </Button>
      </div>
    </div>
  )
}
