import { cn } from 'cn'
import { copy } from '@/lib/copy'

/** Compact occupancy: a thin bar for skaters and one dot per goalie slot. */
export function Occupancy({
  skaters,
  capacity,
  goalies,
  goalieSlots,
  inverted = false,
  className,
}: {
  skaters: number
  capacity: number
  goalies: number
  goalieSlots: number
  /** On the dark boards surface (home hero). */
  inverted?: boolean
  className?: string
}) {
  const ratio = capacity > 0 ? Math.min(skaters / capacity, 1) : 0
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="sr-only">{copy.sessions.occupancy(skaters, capacity, goalies, goalieSlots)}</span>
      <span aria-hidden="true" className={cn('relative h-1.5 w-16 overflow-hidden rounded-full sm:w-24', inverted ? 'bg-white/20' : 'bg-surface-2')}>
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            inverted ? 'bg-white' : ratio >= 1 ? 'bg-boards dark:bg-foreground' : 'bg-primary',
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span aria-hidden="true" className="text-sm font-semibold tabular-nums">
        {skaters}/{capacity}
      </span>
      {goalieSlots > 0 && (
        <span aria-hidden="true" className="flex gap-1">
          {Array.from({ length: goalieSlots }, (_, i) => (
            <span
              key={i}
              className={cn('size-2.5 rounded-full border-2 border-goalie', i < goalies ? 'bg-goalie' : 'bg-transparent')}
            />
          ))}
        </span>
      )}
    </div>
  )
}
