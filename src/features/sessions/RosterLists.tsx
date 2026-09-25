import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { WhatsappIcon } from '@/components/WhatsappIcon'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSessionAdminActions } from '@/features/sessions/api'
import type { RosterRegistration, SessionView, SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { formatDateTimeShort } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import { contactGuestText, whatsappChatUrl } from '@/lib/whatsapp'

function useRegistrantPhones(session: SessionWithRoster, enabled: boolean) {
  const ids = session.registrations.map((r) => r.user_id).sort()
  return useQuery({
    queryKey: ['sessions', 'phones', session.id, ids.join(',')],
    enabled: enabled && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('profile_private').select('user_id, phone_e164').in('user_id', ids)
      if (error) throw error
      return new Map(data.map((row) => [row.user_id, row.phone_e164]))
    },
  })
}

export function RosterLists({
  session,
  view,
  userId,
  isAdmin,
}: {
  session: SessionWithRoster
  view: SessionView
  userId: string | null
  isAdmin: boolean
}) {
  const phones = useRegistrantPhones(session, isAdmin)
  const actions = useSessionAdminActions(session.id)
  const [removing, setRemoving] = useState<RosterRegistration | null>(null)
  const editable = session.status === 'scheduled'

  const renderRow = (registration: RosterRegistration, index: number, options: { numbered?: boolean; pending?: boolean } = {}) => {
    const name = registration.profile?.full_name ?? copy.sessions.lists.unknownGuest
    const phone = phones.data?.get(registration.user_id)
    return (
      <li key={registration.id} className="flex min-h-14 items-center gap-3 border-t border-border py-2">
        <span className="w-8 shrink-0 text-center font-display text-xl text-muted-foreground" aria-hidden="true">
          {options.numbered ? `${index + 1}.` : (registration.profile?.jersey_number ?? '')}
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-semibold">{name}</span>
          {registration.profile?.nickname && <span className="text-muted-foreground"> {registration.profile.nickname}</span>}
          <div className="flex flex-wrap gap-1.5 empty:hidden">
            {registration.user_id === userId && <Badge variant="solid">{copy.common.you}</Badge>}
            {registration.is_guest && <Badge variant="neutral">{copy.sessions.lists.guest}</Badge>}
            {registration.role === 'goalie' && options.numbered && <Badge variant="goalie">brankár</Badge>}
            {registration.promoted_at && registration.status === 'confirmed' && <Badge variant="outline">{copy.sessions.lists.promoted}</Badge>}
          </div>
        </div>
        {isAdmin && phone && registration.user_id !== userId && registration.is_guest && (
          <Button variant="ghost" size="icon" asChild>
            <a
              href={whatsappChatUrl(phone, contactGuestText(session.group.name, formatDateTimeShort(session.starts_at)))}
              target="_blank"
              rel="noreferrer"
              aria-label={`${copy.sessions.admin.contactGuest}: ${name}`}
            >
              <WhatsappIcon />
            </a>
          </Button>
        )}
        {isAdmin && editable && options.pending && (
          <>
            <Button
              size="sm"
              disabled={actions.approve.isPending}
              onClick={() => actions.approve.mutate(registration.id, { onSuccess: () => toast.success(copy.sessions.admin.approved) })}
            >
              <Check aria-hidden="true" />
              {copy.sessions.admin.approve}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={actions.reject.isPending}
              onClick={() => actions.reject.mutate(registration.id, { onSuccess: () => toast.success(copy.sessions.admin.rejected) })}
            >
              {copy.sessions.admin.reject}
            </Button>
          </>
        )}
        {isAdmin && editable && !options.pending && (
          <Button variant="ghost" size="icon" onClick={() => setRemoving(registration)} aria-label={`${copy.sessions.admin.remove}: ${name}`}>
            <X />
          </Button>
        )}
      </li>
    )
  }

  const waitlist = [...view.waitlistSkaters, ...view.waitlistGoalies]
  return (
    <div className="flex flex-col gap-8">
      <RosterSection title={copy.sessions.lists.skaters} count={`${view.confirmedSkaters.length}/${session.skater_capacity}`}>
        {view.confirmedSkaters.length === 0 ? (
          <p className="border-t border-border py-3 text-muted-foreground">{copy.sessions.lists.emptySkaters}</p>
        ) : (
          <ul>{view.confirmedSkaters.map((r, i) => renderRow(r, i))}</ul>
        )}
      </RosterSection>
      {session.goalie_slots > 0 && (
        <RosterSection title={copy.sessions.lists.goalies} count={`${view.confirmedGoalies.length}/${session.goalie_slots}`}>
          {view.confirmedGoalies.length === 0 ? (
            <p className="border-t border-border py-3 text-muted-foreground">{copy.sessions.lists.emptyGoalies}</p>
          ) : (
            <ul>{view.confirmedGoalies.map((r, i) => renderRow(r, i))}</ul>
          )}
        </RosterSection>
      )}
      {waitlist.length > 0 && (
        <RosterSection title={copy.sessions.lists.waitlist} count={String(waitlist.length)}>
          <ul>
            {view.waitlistSkaters.map((r, i) => renderRow(r, i, { numbered: true }))}
            {view.waitlistGoalies.map((r, i) => renderRow(r, i, { numbered: true }))}
          </ul>
        </RosterSection>
      )}
      {view.pending.length > 0 && (
        <RosterSection title={copy.sessions.lists.pending} count={String(view.pending.length)}>
          <ul>{view.pending.map((r, i) => renderRow(r, i, { pending: true }))}</ul>
        </RosterSection>
      )}
      {isAdmin && view.lateCancelled.length > 0 && (
        <RosterSection title={copy.sessions.lists.lateCancelled} count={String(view.lateCancelled.length)}>
          <ul>{view.lateCancelled.map((r, i) => renderRow(r, i))}</ul>
        </RosterSection>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.sessions.admin.removeConfirmTitle(removing?.profile?.full_name ?? copy.sessions.lists.unknownGuest)}</AlertDialogTitle>
            <AlertDialogDescription>{copy.sessions.admin.removeConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removing && actions.remove.mutate(removing.id, { onSuccess: () => toast.success(copy.sessions.admin.removed) })}
            >
              {copy.sessions.admin.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RosterSection({ title, count, children }: { title: string; count: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-baseline justify-between pb-1 font-display text-xl">
        {title}
        <span className="font-display-medium text-base text-muted-foreground">{count}</span>
      </h2>
      {children}
    </section>
  )
}
