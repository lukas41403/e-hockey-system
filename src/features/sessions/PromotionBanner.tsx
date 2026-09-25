import { Link } from 'react-router'
import { ArrowUpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMarkPromotionSeen } from '@/features/sessions/api'
import type { SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { formatDateTimeLong } from '@/lib/dates'

/** Prominent notice until the player acknowledges that they moved up from the waitlist. */
export function PromotionBanner({ sessions, userId }: { sessions: SessionWithRoster[]; userId: string }) {
  const markSeen = useMarkPromotionSeen()
  const promoted = sessions.flatMap((session) =>
    session.registrations
      .filter((r) => r.user_id === userId && r.status === 'confirmed' && r.promoted_at && !r.promotion_seen_at)
      .map((registration) => ({ session, registration })),
  )
  if (promoted.length === 0) return null

  return (
    <div className="mb-5 flex flex-col gap-3">
      {promoted.map(({ session, registration }) => (
        <section
          key={registration.id}
          role="status"
          aria-labelledby={`promo-${registration.id}`}
          className="rounded-xl bg-primary p-4 text-primary-foreground"
        >
          <div className="flex items-start gap-3">
            <ArrowUpCircle className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id={`promo-${registration.id}`} className="font-display text-xl">
                {copy.sessions.promotionTitle}
              </h2>
              <p className="mt-1 text-base">
                {session.group.name}: {copy.sessions.promotionBody(formatDateTimeLong(session.starts_at))}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="border-transparent bg-white text-boards hover:bg-white/90 dark:bg-background dark:text-foreground"
                  disabled={markSeen.isPending}
                  onClick={() => markSeen.mutate(registration.id)}
                >
                  {copy.sessions.promotionAck}
                </Button>
                <Button variant="ghost" className="text-primary-foreground hover:bg-white/15" asChild>
                  <Link to={`/terminy/${session.id}`}>Pozrieť termín</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
