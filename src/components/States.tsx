import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { copy } from '@/lib/copy'
import { getErrorMessage } from '@/lib/errors'

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border-t border-border py-8">
      <h3 className="font-display text-xl">{title}</h3>
      {body && <p className="measure text-base text-muted-foreground">{body}</p>}
      {action && <div className="flex flex-wrap gap-2 pt-1">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  return (
    <div role="alert" className="flex flex-col items-start gap-3 border-t border-border py-8">
      <h3 className="font-display text-xl">{copy.common.errorTitle}</h3>
      <p className="measure text-base text-muted-foreground">{offline ? copy.common.offline : getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {copy.common.retry}
        </Button>
      )}
    </div>
  )
}
