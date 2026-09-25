import { Link, useParams } from 'react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { ActionBar } from '@/components/ActionBar'
import { SectionTitle } from '@/components/PageHeader'
import { Occupancy } from '@/components/rink/Occupancy'
import { RinkRoster } from '@/components/rink/RinkRoster'
import { ShareButtons } from '@/components/ShareButtons'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authContext'
import { useMyGroups } from '@/features/groups/api'
import { useMyProfile } from '@/features/profile/api'
import { SessionAdminPanel } from '@/features/sessions/SessionAdminPanel'
import { PriceInfo } from '@/features/sessions/PriceInfo'
import { RegistrationActions } from '@/features/sessions/RegistrationActions'
import { RosterLists } from '@/features/sessions/RosterLists'
import { SessionFormDialog } from '@/features/sessions/SessionFormDialog'
import { sessionKeys, useRealtimeRefresh, useSession } from '@/features/sessions/api'
import { viewSession, type SessionView, type SessionWithRoster } from '@/features/sessions/model'
import { PayButton } from '@/features/payments/PayButton'
import { copy } from '@/lib/copy'
import { formatDateLong, formatTime } from '@/lib/dates'
import { appUrl } from '@/lib/env'
import { formatMoney } from '@/lib/money'
import { useNow } from '@/lib/useNow'
import { sessionShareText } from '@/lib/whatsapp'

export function SessionDetailPage() {
  const { sessionId } = useParams()
  const { userId } = useAuth()
  const now = useNow()
  const session = useSession(sessionId)
  const groups = useMyGroups()
  const profile = useMyProfile()

  useRealtimeRefresh(
    'session-detail',
    [
      { table: 'registrations', filter: `session_id=eq.${sessionId}` },
      { table: 'sessions', filter: `id=eq.${sessionId}` },
    ],
    [sessionKeys.detail(sessionId ?? '')],
  )

  if (session.isPending) return <SessionSkeleton />
  if (session.isError) return <ErrorState error={session.error} onRetry={() => session.refetch()} />
  if (!session.data) return <EmptyState title="Termín neexistuje" body="Možno bol zmazaný alebo nemáš k nemu prístup." />

  const data = session.data
  const membership = groups.data?.find((g) => g.group.id === data.group_id)
  const isAdmin = membership?.role === 'admin'
  const view = viewSession(data, userId, now)
  const preferredRole = profile.data?.profile.preferred_role ?? 'skater'

  return (
    <article className="pb-40 lg:pb-0">
      <Link
        to={membership ? `/partie/${data.group_id}` : '/'}
        className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {data.group.name}
      </Link>
      <header className="pb-5">
        <h1 className="font-display text-title first-letter:uppercase sm:text-display">{formatDateLong(data.starts_at)}</h1>
        <p className="font-display text-display leading-none">
          {formatTime(data.starts_at)}
          <span className="font-display-medium text-xl text-muted-foreground"> až {formatTime(data.ends_at)}</span>
        </p>
        <p className="mt-2 text-base">{data.venue}</p>
        {data.notes && <p className="mt-1 measure text-base text-muted-foreground">{data.notes}</p>}
        <div className="mt-2 flex flex-wrap gap-2 empty:hidden">
          {data.status === 'cancelled' && <Badge variant="debt">{copy.sessions.status.cancelled}</Badge>}
          {data.status === 'completed' && <Badge variant="neutral">{copy.sessions.status.completed}</Badge>}
          {data.status === 'scheduled' && view.isStarted && <Badge variant="neutral">{copy.sessions.status.started}</Badge>}
        </div>
      </header>

      <RinkFigure session={data} view={view} userId={userId} />

      {(view.isOpen || view.mine) && data.status !== 'cancelled' && (
        <ActionBar>
          <div className="flex flex-col gap-2 lg:mt-6">
            <RegistrationActions session={data} view={view} preferredRole={preferredRole} size="lg" />
          </div>
        </ActionBar>
      )}

      <section className="mt-6">
        <PriceInfo session={data} view={view} />
        <div className="mt-4 flex flex-wrap gap-2">
          <PayButton groupId={data.group_id} />
        </div>
      </section>

      {data.status === 'scheduled' && (
        <section className="mt-6">
          <ShareButtons
            title={data.group.name}
            url={appUrl(`/terminy/${data.id}`)}
            text={sessionShareText({
              groupName: data.group.name,
              startsAt: data.starts_at,
              venue: data.venue,
              freeSkaterSpots: view.freeSkaterSpots,
              freeGoalieSpots: data.goalie_slots > 0 ? view.freeGoalieSpots : null,
              priceText:
                data.pricing_mode === 'fixed'
                  ? formatMoney(data.price_per_skater_cents ?? 0, data.group.currency)
                  : view.estimate.full != null
                    ? `približne ${formatMoney(view.estimate.full, data.group.currency)}`
                    : null,
              goalieFeeText: data.goalie_slots > 0 && data.goalie_fee_cents > 0 ? formatMoney(data.goalie_fee_cents, data.group.currency) : null,
              url: appUrl(`/terminy/${data.id}`),
            })}
          />
        </section>
      )}

      {isAdmin && membership && (
        <>
          <SectionTitle
            action={
              data.status === 'scheduled' ? (
                <SessionFormDialog
                  group={membership.group}
                  session={data}
                  trigger={
                    <Button variant="secondary" size="sm">
                      <Pencil aria-hidden="true" />
                      {copy.sessions.edit}
                    </Button>
                  }
                />
              ) : undefined
            }
          >
            Správa termínu
          </SectionTitle>
          <SessionAdminPanel session={data} view={view} />
        </>
      )}

      <div className="mt-8">
        <RosterLists session={data} view={view} userId={userId} isAdmin={isAdmin} />
      </div>
    </article>
  )
}

function RinkFigure({ session, view, userId }: { session: SessionWithRoster; view: SessionView; userId: string | null }) {
  const label = copy.sessions.occupancy(view.confirmedSkaters.length, session.skater_capacity, view.confirmedGoalies.length, session.goalie_slots)
  if (session.skater_capacity > 30) {
    return (
      <div className="border-y border-border py-4">
        <Occupancy
          skaters={view.confirmedSkaters.length}
          capacity={session.skater_capacity}
          goalies={view.confirmedGoalies.length}
          goalieSlots={session.goalie_slots}
        />
        <p className="mt-2 text-base">{label}</p>
      </div>
    )
  }
  const props = {
    skaterCapacity: session.skater_capacity,
    goalieSlots: session.goalie_slots,
    skaters: view.confirmedSkaters,
    goalies: view.confirmedGoalies,
    myUserId: userId,
  }
  return (
    <figure className="flex flex-col items-center gap-3 lg:items-stretch">
      <RinkRoster {...props} orientation="portrait" className="h-[min(58vh,30rem)] w-auto max-w-full lg:hidden" />
      <RinkRoster {...props} orientation="landscape" className="hidden h-auto w-full lg:block" />
      <figcaption className="text-base font-semibold" aria-hidden="true">
        {label}
      </figcaption>
    </figure>
  )
}

function SessionSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-3 h-5 w-32" />
      <Skeleton className="mb-2 h-9 w-3/4" />
      <Skeleton className="mb-3 h-11 w-40" />
      <Skeleton className="mb-6 h-5 w-1/2" />
      <Skeleton className="mx-auto h-[min(58vh,30rem)] w-[min(52vw,13rem)] rounded-[2rem] lg:h-72 lg:w-full" />
    </div>
  )
}
