import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from 'cn'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useCancelRegistration, useRegister } from '@/features/sessions/api'
import { cancellationOutcome, type SessionView, type SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { formatMoney } from '@/lib/money'
import type { PlayerRole } from '@/lib/supabase'

/** My status on the session and the matching actions (register, join waitlist, cancel). */
export function RegistrationActions({
  session,
  view,
  preferredRole,
  size = 'lg',
  className,
}: {
  session: SessionWithRoster
  view: SessionView
  preferredRole: PlayerRole
  size?: 'default' | 'lg'
  className?: string
}) {
  const register = useRegister(session.id)
  const cancel = useCancelRegistration(session.id)
  const [confirmLate, setConfirmLate] = useState(false)
  const mine = view.mine
  const busy = register.isPending || cancel.isPending

  function doRegister(role: PlayerRole) {
    register.mutate(role, {
      onSuccess: (registration) =>
        toast.success(
          registration.status === 'confirmed'
            ? copy.sessions.registered
            : registration.status === 'waitlist'
              ? copy.sessions.registeredWaitlist
              : copy.sessions.registeredPending,
        ),
    })
  }

  function doCancel() {
    if (!mine) return
    cancel.mutate(mine.id, {
      onSuccess: (registration) =>
        toast.success(registration.status === 'late_cancelled' ? copy.sessions.cancelledLate : copy.sessions.cancelled),
    })
  }

  function onCancelClick() {
    if (cancellationOutcome(view) === 'late') setConfirmLate(true)
    else doCancel()
  }

  const statusText = !mine
    ? null
    : mine.status === 'confirmed'
      ? mine.role === 'goalie'
        ? copy.sessions.myStatus.confirmedGoalie
        : copy.sessions.myStatus.confirmed
      : mine.status === 'waitlist'
        ? copy.sessions.myStatus.waitlist(view.myWaitlistPosition ?? 0)
        : mine.status === 'pending'
          ? copy.sessions.myStatus.pending
          : mine.status === 'late_cancelled'
            ? copy.sessions.myStatus.late_cancelled
            : null

  const active = mine && mine.status !== 'late_cancelled'
  const otherRole: PlayerRole = preferredRole === 'skater' ? 'goalie' : 'skater'
  const roles: PlayerRole[] = session.goalie_slots > 0 ? [preferredRole, otherRole] : ['skater']
  const labelFor = (role: PlayerRole) => {
    const full = role === 'skater' ? view.freeSkaterSpots === 0 || view.waitlistSkaters.length > 0 : view.freeGoalieSpots === 0 || view.waitlistGoalies.length > 0
    if (full) return role === 'goalie' ? `${copy.sessions.registerWaitlist} (brankár)` : copy.sessions.registerWaitlist
    return role === 'goalie' ? copy.sessions.registerGoalie : copy.sessions.register
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {statusText && (
        <p className={cn('text-base font-semibold', mine?.status === 'late_cancelled' && 'text-debt')} aria-live="polite">
          {statusText}
        </p>
      )}
      {view.isOpen && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {active ? (
            <Button variant="secondary" size={size} disabled={busy} onClick={onCancelClick}>
              {copy.sessions.cancel}
            </Button>
          ) : (
            roles.map((role, index) => (
              <Button
                key={role}
                size={size}
                variant={index === 0 ? (role === 'goalie' ? 'goalie' : 'default') : 'secondary'}
                disabled={busy}
                onClick={() => doRegister(role)}
              >
                {labelFor(role)}
              </Button>
            ))
          )}
        </div>
      )}

      <AlertDialog open={confirmLate} onOpenChange={setConfirmLate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.sessions.lateCancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {mine?.role === 'goalie'
                ? copy.sessions.lateCancelBodyGoalie
                : copy.sessions.lateCancelBody(view.estimate.current != null ? formatMoney(view.estimate.current, session.group.currency) : null)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.back}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={doCancel}>
              {copy.sessions.lateCancelConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
