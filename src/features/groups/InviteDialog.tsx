import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { CopyField } from '@/components/CopyField'
import { ShareButtons } from '@/components/ShareButtons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useRegenerateInviteCode } from '@/features/groups/api'
import { copy } from '@/lib/copy'
import { inviteUrl } from '@/features/groups/groupContext'
import type { Group } from '@/lib/supabase'

export function InviteDialog({ group, trigger }: { group: Group; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const regenerate = useRegenerateInviteCode(group.id)
  const url = inviteUrl(group.invite_code)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UserPlus aria-hidden="true" />
            {copy.groups.invite}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.groups.inviteTitle}</DialogTitle>
          <DialogDescription>{copy.groups.inviteBody}</DialogDescription>
        </DialogHeader>
        <CopyField label={copy.groups.inviteLink} value={url} display={url.replace(/^https?:\/\//, '')} />
        <ShareButtons title={group.name} url={url} text={copy.groups.inviteShareText(group.name, url)} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="link" className="self-start">
              {copy.groups.regenerate}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.groups.regenerateConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{copy.groups.regenerateConfirmBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={() => regenerate.mutate(undefined, { onSuccess: () => toast.success(copy.groups.regenerated) })}>
                {copy.groups.regenerate}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
