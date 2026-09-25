import { CalendarPlus } from 'lucide-react'
import { SectionTitle } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authContext'
import { useGroupContext } from '@/features/groups/groupContext'
import { InviteDialog } from '@/features/groups/InviteDialog'
import { SessionFormDialog } from '@/features/sessions/SessionFormDialog'
import { SessionRow } from '@/features/sessions/SessionRow'
import { sessionKeys, useGroupSessions, useRealtimeRefresh } from '@/features/sessions/api'
import { copy } from '@/lib/copy'
import { useNow } from '@/lib/useNow'

export function GroupSessionsTab() {
  const { group, isAdmin } = useGroupContext()
  const { userId } = useAuth()
  const now = useNow()
  const sessions = useGroupSessions(group.id)
  useRealtimeRefresh('group-sessions', [{ table: 'registrations', filter: `group_id=eq.${group.id}` }, { table: 'sessions', filter: `group_id=eq.${group.id}` }], [sessionKeys.group(group.id)])

  const createButton = isAdmin ? (
    <SessionFormDialog
      group={group}
      latestStart={sessions.data?.[0]?.starts_at ?? null}
      trigger={
        <Button>
          <CalendarPlus aria-hidden="true" />
          {copy.sessions.create}
        </Button>
      }
    />
  ) : null

  if (sessions.isPending) return <ListSkeleton />
  if (sessions.isError) return <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />

  const cutoff = now.getTime() - 4 * 3600_000
  const upcoming = sessions.data.filter((s) => new Date(s.starts_at).getTime() >= cutoff && s.status !== 'completed').reverse()
  const past = sessions.data.filter((s) => !upcoming.includes(s))

  if (sessions.data.length === 0) {
    return (
      <EmptyState
        title={copy.groups.emptyTitle}
        body={isAdmin ? copy.groups.emptyBody : copy.sessions.noUpcomingBody}
        action={
          isAdmin ? (
            <>
              {createButton}
              <InviteDialog group={group} trigger={<Button variant="secondary">{copy.groups.invite}</Button>} />
            </>
          ) : undefined
        }
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="font-display text-xl">{copy.sessions.upcomingTitle}</h2>
        {createButton}
      </div>
      {upcoming.length === 0 ? (
        <p className="border-t border-border py-4 text-muted-foreground">
          {isAdmin ? copy.sessions.noUpcomingAdminBody : copy.sessions.noUpcomingBody}
        </p>
      ) : (
        <ul>
          {upcoming.map((session) => (
            <SessionRow key={session.id} session={session} userId={userId} />
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <>
          <SectionTitle>{copy.sessions.pastTitle}</SectionTitle>
          <ul>
            {past.map((session) => (
              <SessionRow key={session.id} session={session} userId={userId} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex min-h-18 items-center gap-4 border-t border-border py-3 first:border-t-0">
          <div className="w-24">
            <Skeleton className="mb-1.5 h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </li>
      ))}
    </ul>
  )
}
