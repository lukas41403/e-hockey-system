import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useGroupMembers } from '@/features/groups/api'
import { useSessionAdminActions } from '@/features/sessions/api'
import type { SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import type { PlayerRole } from '@/lib/supabase'

export function AddPlayerDialog({ session }: { session: SessionWithRoster }) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<PlayerRole>('skater')
  const members = useGroupMembers(open ? session.group_id : undefined)
  const { addPlayer } = useSessionAdminActions(session.id)

  const taken = new Set(
    session.registrations.filter((r) => ['pending', 'confirmed', 'waitlist'].includes(r.status)).map((r) => r.user_id),
  )
  const available = (members.data ?? []).filter((m) => !taken.has(m.user_id))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setUserId('')
          setRole('skater')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">
          <UserPlus aria-hidden="true" />
          {copy.sessions.admin.addPlayer}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.sessions.admin.addPlayerTitle}</DialogTitle>
          <DialogDescription>{copy.sessions.admin.addPlayerHint}</DialogDescription>
        </DialogHeader>
        {members.isSuccess && available.length === 0 ? (
          <p className="text-base text-muted-foreground">{copy.sessions.admin.noMembersLeft}</p>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!userId) return
              addPlayer.mutate(
                { userId, role },
                {
                  onSuccess: () => {
                    toast.success(copy.sessions.admin.added)
                    setOpen(false)
                  },
                },
              )
            }}
          >
            <FormField id="member" label={copy.groups.members.title}>
              {(c) => (
                <NativeSelect {...c} value={userId} onChange={(event) => setUserId(event.target.value)} required>
                  <option value="" disabled>
                    {copy.sessions.admin.searchMember}
                  </option>
                  {available.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profile?.full_name}
                      {member.profile?.jersey_number != null ? ` (${member.profile.jersey_number})` : ''}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            {session.goalie_slots > 0 && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold">{copy.sessions.admin.addAs}</legend>
                <ToggleGroup type="single" value={role} onValueChange={(value) => value && setRole(value as PlayerRole)}>
                  <ToggleGroupItem value="skater">{copy.profile.skater}</ToggleGroupItem>
                  <ToggleGroupItem value="goalie">{copy.profile.goalie}</ToggleGroupItem>
                </ToggleGroup>
              </fieldset>
            )}
            <Button type="submit" size="lg" disabled={!userId || addPlayer.isPending}>
              {copy.sessions.admin.addPlayer}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
