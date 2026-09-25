import type { SessionView, SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { formatDeadlinePhrase } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export function PriceInfo({ session, view }: { session: SessionWithRoster; view: SessionView }) {
  const currency = session.group.currency
  const fee = session.goalie_slots > 0 && session.goalie_fee_cents > 0 ? formatMoney(session.goalie_fee_cents, currency) : null

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      <div>
        {session.status === 'completed' ? (
          <>
            <dt className="text-sm text-muted-foreground">{copy.sessions.finalPrice}</dt>
            <dd className="font-display text-title">
              {session.final_price_per_skater_cents != null ? formatMoney(session.final_price_per_skater_cents, currency) : copy.sessions.noPayers}
            </dd>
          </>
        ) : session.pricing_mode === 'fixed' ? (
          <>
            <dt className="text-sm text-muted-foreground">{copy.sessions.price}</dt>
            <dd className="font-display text-title">{formatMoney(session.price_per_skater_cents ?? 0, currency)}</dd>
          </>
        ) : (
          <>
            <dt className="text-sm text-muted-foreground">{copy.sessions.estimate}</dt>
            <dd>
              <span className="font-display text-title">{view.estimate.current != null ? formatMoney(view.estimate.current, currency) : '–'}</span>{' '}
              <span className="text-sm text-muted-foreground">{copy.sessions.estimateNow}</span>
              <div className="text-sm">
                {view.estimate.full != null && (
                  <>
                    <span className="font-semibold tabular-nums">{formatMoney(view.estimate.full, currency)}</span> {copy.sessions.estimateFull}
                  </>
                )}
              </div>
              <p className="mt-1 measure text-sm text-muted-foreground">{copy.sessions.estimateHint}</p>
            </dd>
          </>
        )}
      </div>
      {session.status === 'scheduled' && (
        <div>
          <dt className="sr-only">Odhlásenie</dt>
          <dd className="text-base">
            {view.isAfterDeadline
              ? copy.sessions.freeCancellationOver
              : copy.sessions.freeCancellation(formatDeadlinePhrase(view.freeCancellationUntil))}
          </dd>
          {fee && <dd className="mt-1 text-base text-goalie-text">{copy.sessions.goalieFeeInfo(fee)}</dd>}
        </div>
      )}
    </dl>
  )
}
