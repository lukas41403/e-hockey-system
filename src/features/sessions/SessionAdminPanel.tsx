import { Ban, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
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
import { AddPlayerDialog } from '@/features/sessions/AddPlayerDialog'
import { AttendanceDialog } from '@/features/sessions/AttendanceDialog'
import { PublishDialog } from '@/features/marketplace/PublishDialog'
import { useSessionAdminActions } from '@/features/sessions/api'
import type { SessionView, SessionWithRoster } from '@/features/sessions/model'
import { copy } from '@/lib/copy'

export function SessionAdminPanel({ session, view }: { session: SessionWithRoster; view: SessionView }) {
  const actions = useSessionAdminActions(session.id)
  if (session.status === 'cancelled') return <p className="text-base text-muted-foreground">{copy.sessions.status.cancelled}.</p>

  return (
    <div className="flex flex-col gap-3">
      {session.status === 'scheduled' && !view.isStarted && <p className="text-sm text-muted-foreground">{copy.attendance.notStarted}</p>}
    <div className="flex flex-wrap gap-2">
      {session.status === 'scheduled' && view.isStarted && <AttendanceDialog session={session} view={view} />}
      {session.status === 'completed' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="secondary">
              <RotateCcw aria-hidden="true" />
              {copy.sessions.admin.reopen}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.sessions.admin.reopenTitle}</AlertDialogTitle>
              <AlertDialogDescription>{copy.sessions.admin.reopenBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.common.back}</AlertDialogCancel>
              <AlertDialogAction onClick={() => actions.reopen.mutate(undefined, { onSuccess: () => toast.success(copy.sessions.admin.reopened) })}>
                {copy.sessions.admin.reopen}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {session.status === 'scheduled' && <AddPlayerDialog session={session} />}
      {view.isOpen && <PublishDialog session={session} view={view} />}
      {session.status === 'scheduled' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive-outline">
              <Ban aria-hidden="true" />
              {copy.sessions.admin.cancelSession}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.sessions.admin.cancelSessionTitle}</AlertDialogTitle>
              <AlertDialogDescription>{copy.sessions.admin.cancelSessionBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.common.back}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => actions.cancelSession.mutate(undefined, { onSuccess: () => toast.success(copy.sessions.admin.sessionCancelled) })}
              >
                {copy.sessions.admin.cancelSession}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
    </div>
  )
}
