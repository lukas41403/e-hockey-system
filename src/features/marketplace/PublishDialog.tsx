import { useState } from 'react'
import { Link } from 'react-router'
import { Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { ShareButtons } from '@/components/ShareButtons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useActivePost, useSessionAdminActions } from '@/features/sessions/api'
import type { SessionView, SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { appUrl } from '@/lib/env'
import { formatMoney } from '@/lib/money'
import { sessionShareText } from '@/lib/whatsapp'

export function PublishDialog({ session, view }: { session: SessionWithRoster; view: SessionView }) {
  const [open, setOpen] = useState(false)
  const post = useActivePost(session.id, true)
  const actions = useSessionAdminActions(session.id)
  const [offerSkaters, setOfferSkaters] = useState(true)
  const [offerGoalies, setOfferGoalies] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [note, setNote] = useState('')

  const active = post.data
  const url = active ? appUrl(`/burza/${active.id}`) : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOfferSkaters(view.freeSkaterSpots > 0)
          setOfferGoalies(session.goalie_slots > 0 && view.freeGoalieSpots > 0)
          setRequireApproval(true)
          setNote('')
        }
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Megaphone aria-hidden="true" />
          {active ? copy.sessions.admin.published : copy.sessions.admin.publish}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.marketplace.publishTitle}</DialogTitle>
          <DialogDescription>{copy.marketplace.publishHint}</DialogDescription>
        </DialogHeader>
        {active ? (
          <div className="flex flex-col gap-4">
            <p className="text-base">
              {copy.sessions.admin.published}.{' '}
              <Link to={`/burza/${active.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                Otvoriť verejnú stránku
              </Link>
            </p>
            <ShareButtons
              title={session.group.name}
              url={url}
              text={sessionShareText({
                groupName: session.group.name,
                startsAt: session.starts_at,
                venue: session.venue,
                freeSkaterSpots: active.offer_skaters ? view.freeSkaterSpots : null,
                freeGoalieSpots: active.offer_goalies ? view.freeGoalieSpots : null,
                priceText: null,
                goalieFeeText: active.offer_goalies && session.goalie_fee_cents > 0 ? formatMoney(session.goalie_fee_cents, session.group.currency) : null,
                url,
              })}
            />
            <Button
              variant="destructive-outline"
              disabled={actions.unpublish.isPending}
              onClick={() => actions.unpublish.mutate(undefined, { onSuccess: () => toast.success(copy.sessions.admin.unpublished) })}
            >
              {copy.sessions.admin.unpublish}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              actions.publish.mutate(
                { offerSkaters, offerGoalies, requireApproval, note: note.trim() || null },
                { onSuccess: () => toast.success(copy.sessions.admin.published) },
              )
            }}
          >
            <label className="flex min-h-11 items-center justify-between gap-3 text-base font-semibold">
              {copy.marketplace.offerSkaters}
              <Switch checked={offerSkaters} onCheckedChange={setOfferSkaters} />
            </label>
            {session.goalie_slots > 0 && (
              <label className="flex min-h-11 items-center justify-between gap-3 text-base font-semibold">
                {copy.marketplace.offerGoalies}
                <Switch checked={offerGoalies} onCheckedChange={setOfferGoalies} />
              </label>
            )}
            <label className="flex min-h-11 items-center justify-between gap-3 text-base font-semibold">
              {copy.marketplace.requireApproval}
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            </label>
            <FormField id="post-note" label={copy.marketplace.note} optional>
              {(c) => <Textarea {...c} value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={2} className="min-h-16" />}
            </FormField>
            <Button type="submit" size="lg" disabled={actions.publish.isPending || (!offerSkaters && !offerGoalies)}>
              {copy.marketplace.publish}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
