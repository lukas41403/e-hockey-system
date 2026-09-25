import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Occupancy } from '@/components/rink/Occupancy'
import { Badge } from '@/components/ui/badge'
import { MyStatusBadge } from '@/features/sessions/MyStatusBadge'
import { viewSession, type SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { formatDayShort, formatTime, relativeDayLabel } from '@/lib/dates'

export function SessionRow({ session, userId, showGroup }: { session: SessionWithRoster; userId: string | null; showGroup?: boolean }) {
  const view = viewSession(session, userId)
  const relative = relativeDayLabel(session.starts_at)
  return (
    <li className="border-t border-border first:border-t-0">
      <Link to={`/terminy/${session.id}`} className="group flex min-h-18 items-center gap-3 py-3 hover:bg-surface-2/60 sm:gap-4 sm:px-2">
        <div className="w-24 shrink-0">
          <div className="font-display text-xl leading-tight">{formatTime(session.starts_at)}</div>
          <div className="text-sm text-muted-foreground">{relative ? `${relative}, ${formatDayShort(session.starts_at).split(' ')[0]}` : formatDayShort(session.starts_at)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{showGroup ? session.group.name : session.venue}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {session.status === 'cancelled' ? (
              <Badge variant="outline">{copy.sessions.status.cancelled}</Badge>
            ) : session.status === 'completed' ? (
              <Badge variant="neutral">{copy.sessions.status.completed}</Badge>
            ) : (
              <Occupancy
                skaters={view.confirmedSkaters.length}
                capacity={session.skater_capacity}
                goalies={view.confirmedGoalies.length}
                goalieSlots={session.goalie_slots}
              />
            )}
            <MyStatusBadge view={view} />
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
      </Link>
    </li>
  )
}
