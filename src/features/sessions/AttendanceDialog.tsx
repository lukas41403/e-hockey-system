import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useSessionAdminActions } from '@/features/sessions/api'
import type { RosterRegistration, SessionView, SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { formatMoney } from '@/lib/money'
import { skaterPrice } from '@/lib/pricing'

export function AttendanceDialog({ session, view }: { session: SessionWithRoster; view: SessionView }) {
  const [open, setOpen] = useState(false)
  const initial = () =>
    Object.fromEntries([...view.confirmedSkaters, ...view.confirmedGoalies].map((r) => [r.id, r.attended ?? true]))
  const [attendance, setAttendance] = useState<Record<string, boolean>>(initial)
  const { finalize } = useSessionAdminActions(session.id)
  const currency = session.group.currency

  const lateSkaters = view.lateCancelled.filter((r) => r.role === 'skater')
  const payers = view.confirmedSkaters.length + lateSkaters.length
  const goaliesAttended = view.confirmedGoalies.filter((r) => attendance[r.id]).length
  const price = skaterPrice({
    pricingMode: session.pricing_mode,
    pricePerSkaterCents: session.price_per_skater_cents,
    iceCostCents: session.ice_cost_cents,
    goalieFeeCents: session.goalie_fee_cents,
    goaliesAttended,
    payers,
    roundingStepCents: session.rounding_step_cents,
  })
  const charged = (price ?? 0) * payers
  const goalieFees = session.goalie_fee_cents * goaliesAttended
  const result = charged - session.ice_cost_cents - goalieFees

  const row = (registration: RosterRegistration) => {
    const came = attendance[registration.id] ?? true
    const name = registration.profile?.full_name ?? copy.sessions.lists.unknownGuest
    return (
      <li key={registration.id} className="flex min-h-16 items-center justify-between gap-3 border-t border-border py-2">
        <span className="min-w-0 font-semibold">
          <span className="mr-2 inline-block w-7 font-display text-muted-foreground">{registration.profile?.jersey_number ?? ''}</span>
          {name}
        </span>
        <div role="radiogroup" aria-label={name} className="flex shrink-0 rounded-md border border-input p-0.5">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={came === value}
              onClick={() => setAttendance((current) => ({ ...current, [registration.id]: value }))}
              className={cn(
                'h-12 min-w-24 rounded-sm px-3 text-sm font-semibold',
                came === value ? (value ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground') : 'text-muted-foreground',
              )}
            >
              {value ? copy.attendance.came : copy.attendance.missed}
            </button>
          ))}
        </div>
      </li>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setAttendance(initial())
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <ClipboardCheck aria-hidden="true" />
          {copy.sessions.admin.attendance}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.attendance.title}</DialogTitle>
          <DialogDescription>{copy.attendance.intro}</DialogDescription>
        </DialogHeader>
        <section>
          <h3 className="font-display text-xl">{copy.sessions.lists.skaters}</h3>
          <ul>{view.confirmedSkaters.map(row)}</ul>
        </section>
        {view.confirmedGoalies.length > 0 && (
          <section>
            <h3 className="font-display text-xl">{copy.sessions.lists.goalies}</h3>
            <ul>{view.confirmedGoalies.map(row)}</ul>
          </section>
        )}
        {lateSkaters.length > 0 && (
          <section>
            <h3 className="font-display text-xl">{copy.sessions.lists.lateCancelled}</h3>
            <ul>
              {lateSkaters.map((r) => (
                <li key={r.id} className="flex min-h-12 items-center border-t border-border py-2 font-semibold">
                  {r.profile?.full_name}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-labelledby="closing-summary" className="rounded-lg bg-surface-2 p-4">
          <h3 id="closing-summary" className="font-display text-xl">
            {copy.attendance.summaryTitle}
          </h3>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-base">
            <dt>{copy.attendance.payingSkaters}</dt>
            <dd className="text-right font-semibold tabular-nums">
              {payers}
              {lateSkaters.length > 0 && <span className="block text-sm font-normal text-muted-foreground">{copy.attendance.lateCancelledIncluded(lateSkaters.length)}</span>}
            </dd>
            <dt>{copy.attendance.price}</dt>
            <dd className="text-right font-semibold tabular-nums">{price != null ? formatMoney(price, currency) : '–'}</dd>
            <dt>{copy.attendance.goaliesPaid}</dt>
            <dd className="text-right font-semibold tabular-nums">
              {goaliesAttended} × {formatMoney(session.goalie_fee_cents, currency)}
            </dd>
            <dt>{copy.attendance.iceCost}</dt>
            <dd className="text-right font-semibold tabular-nums">{formatMoney(session.ice_cost_cents, currency)}</dd>
            <dt className="font-semibold">{copy.attendance.result}</dt>
            <dd className={cn('text-right font-display text-xl', result < 0 && 'text-debt')}>{formatMoney(result, currency, { signed: true })}</dd>
          </dl>
          {payers === 0 && <p className="mt-2 text-sm text-muted-foreground">{copy.sessions.noPayers}</p>}
        </section>
        <Button
          size="lg"
          disabled={finalize.isPending}
          onClick={() =>
            finalize.mutate(attendance, {
              onSuccess: () => {
                toast.success(copy.attendance.finalized)
                setOpen(false)
              },
            })
          }
        >
          {copy.attendance.confirm}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
