import { Link } from 'react-router'
import { MapPin, Store, UsersRound } from 'lucide-react'
import { Money } from '@/components/Money'
import { SectionTitle } from '@/components/PageHeader'
import { Occupancy } from '@/components/rink/Occupancy'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authContext'
import { useMyBalances } from '@/features/finance/api'
import { useMyGroups, type MyGroup } from '@/features/groups/api'
import { PayButton } from '@/features/payments/PayButton'
import { useMyProfile } from '@/features/profile/api'
import { PromotionBanner } from '@/features/sessions/PromotionBanner'
import { RegistrationActions } from '@/features/sessions/RegistrationActions'
import { SessionRow } from '@/features/sessions/SessionRow'
import { ListSkeleton } from '@/features/sessions/GroupSessionsTab'
import { sessionKeys, useRealtimeRefresh, useUpcomingSessions } from '@/features/sessions/api'
import { viewSession, type SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { formatDateLong, formatTime, relativeDayLabel } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export function HomePage() {
  const { userId } = useAuth()
  const groups = useMyGroups()
  const sessions = useUpcomingSessions()
  const balances = useMyBalances()
  useRealtimeRefresh('home', [{ table: 'registrations' }, { table: 'sessions' }], [sessionKeys.upcoming(userId)])

  if (groups.isPending || sessions.isPending) return <HomeSkeleton />
  if (groups.isError) return <ErrorState error={groups.error} onRetry={() => groups.refetch()} />
  if (sessions.isError) return <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />

  if (groups.data.length === 0) {
    return (
      <EmptyState
        title={copy.groups.noGroupsTitle}
        body={copy.groups.noGroupsBody}
        action={
          <>
            <Button asChild>
              <Link to="/partie/nova">
                <UsersRound aria-hidden="true" />
                {copy.nav.createGroup}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/burza">
                <Store aria-hidden="true" />
                {copy.marketplace.title}
              </Link>
            </Button>
          </>
        }
      />
    )
  }

  const memberGroupIds = new Set(groups.data.map((g) => g.group.id))
  const list = sessions.data.filter((s) => memberGroupIds.has(s.group_id))
  const withView = list.map((session) => ({ session, view: viewSession(session, userId) }))
  const hero =
    withView.find(({ view }) => view.mine && view.mine.status !== 'late_cancelled') ?? withView.find(({ view }) => view.isOpen) ?? null
  const rest = withView.filter((item) => item !== hero)

  return (
    <div>
      {userId && <PromotionBanner sessions={list} userId={userId} />}
      {hero ? (
        <NextSessionHero session={hero.session} />
      ) : (
        <EmptyState title={copy.sessions.noUpcomingTitle} body={copy.sessions.noUpcomingBody} />
      )}

      {rest.length > 0 && (
        <>
          <SectionTitle>{copy.sessions.upcomingTitle}</SectionTitle>
          <ul>
            {rest.map(({ session }) => (
              <SessionRow key={session.id} session={session} userId={userId} showGroup={groups.data.length > 1} />
            ))}
          </ul>
        </>
      )}

      <SectionTitle>{copy.finance.balance}</SectionTitle>
      <ul>
        {groups.data.map((membership) => (
          <BalanceRow key={membership.group.id} membership={membership} balance={balances.data?.get(membership.group.id) ?? 0} />
        ))}
      </ul>
    </div>
  )
}

function NextSessionHero({ session }: { session: SessionWithRoster }) {
  const { userId } = useAuth()
  const profile = useMyProfile()
  const view = viewSession(session, userId)
  const relative = relativeDayLabel(session.starts_at)
  return (
    <section aria-labelledby="next-session" className="relative overflow-hidden rounded-2xl bg-boards text-white dark:bg-surface dark:text-foreground">
      <span aria-hidden="true" className="absolute inset-y-0 right-5 w-1.5 bg-[#ff5a6e] opacity-80" />
      <span aria-hidden="true" className="absolute inset-y-0 right-10 w-1 bg-[#7fa6ff] opacity-60" />
      <Link to={`/terminy/${session.id}`} className="relative block py-5 pr-16 pl-5 hover:bg-white/5">
        <h2 id="next-session" className="text-sm font-semibold text-white/70 dark:text-muted-foreground">
          {copy.sessions.nextSession}, {session.group.name}
        </h2>
        <p className="mt-2 font-display text-title first-letter:uppercase">
          {relative ? `${relative}, ` : ''}
          {formatDateLong(session.starts_at)}
        </p>
        <p className="font-display text-[3.5rem] leading-none">{formatTime(session.starts_at)}</p>
        <p className="mt-2 flex items-center gap-1.5 text-base text-white/80 dark:text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          {session.venue}
        </p>
        <Occupancy
          inverted
          className="mt-3"
          skaters={view.confirmedSkaters.length}
          capacity={session.skater_capacity}
          goalies={view.confirmedGoalies.length}
          goalieSlots={session.goalie_slots}
        />
      </Link>
      <div className="relative border-t border-white/10 py-4 pr-16 pl-5 dark:border-border [&_[data-slot=button]]:border-white/30 [&_[data-variant=secondary]]:bg-transparent [&_[data-variant=secondary]]:text-white [&_[data-variant=secondary]]:hover:bg-white/10 dark:[&_[data-variant=secondary]]:text-foreground">
        <RegistrationActions session={session} view={view} preferredRole={profile.data?.profile.preferred_role ?? 'skater'} />
      </div>
    </section>
  )
}

function BalanceRow({ membership, balance }: { membership: MyGroup; balance: number }) {
  const currency = membership.group.currency
  return (
    <li className="flex min-h-16 items-center justify-between gap-3 border-t border-border py-2 first:border-t-0">
      <div className="min-w-0">
        <Link to={`/partie/${membership.group.id}`} className="font-semibold hover:underline">
          {membership.group.name}
        </Link>
        <div className="text-sm">
          {balance < 0 ? (
            <span className="font-semibold text-debt">{copy.finance.owes(formatMoney(-balance, currency))}</span>
          ) : balance > 0 ? (
            <span className="text-muted-foreground">{copy.finance.credit(formatMoney(balance, currency))}</span>
          ) : (
            <span className="text-muted-foreground">{copy.finance.even}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Money cents={balance} currency={currency} className="hidden font-display text-xl sm:inline" />
        <PayButton groupId={membership.group.id} />
      </div>
    </li>
  )
}

function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="mt-8 mb-3 h-6 w-40" />
      <ListSkeleton rows={3} />
    </div>
  )
}
