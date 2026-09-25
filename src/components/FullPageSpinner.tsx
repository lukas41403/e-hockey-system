import { RinkMark } from '@/components/rink/RinkMark'
import { copy } from '@/lib/copy'

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <RinkMark className="size-10 animate-pulse" />
      <span className="sr-only">{copy.common.loading}</span>
    </div>
  )
}
