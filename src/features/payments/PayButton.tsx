import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/authContext'
import { useMyBalances } from '@/features/finance/api'
import { useMyGroups } from '@/features/groups/api'
import { PayDialog } from '@/features/payments/PayDialog'
import { useUpcomingSessions } from '@/features/sessions/api'
import { viewSession } from '@/features/sessions/model'
import { copy } from '@/lib/copy'

/** "Zaplatiť" for a group I belong to; suggests my debt or the estimate of my next session. */
export function PayButton({ groupId, variant }: { groupId: string; variant?: 'default' | 'secondary' }) {
  const { userId } = useAuth()
  const groups = useMyGroups()
  const balances = useMyBalances()
  const upcoming = useUpcomingSessions()
  const membership = groups.data?.find((g) => g.group.id === groupId)
  if (!membership || !balances.data) return null

  const balance = balances.data.get(groupId) ?? 0
  const next = upcoming.data
    ?.filter((s) => s.group_id === groupId)
    .map((s) => ({ session: s, view: viewSession(s, userId) }))
    .find(({ view }) => view.mine && view.mine.status !== 'late_cancelled' && view.mine.role === 'skater')
  const estimate = next ? (next.session.pricing_mode === 'fixed' ? next.session.price_per_skater_cents : next.view.estimate.current) : null

  return (
    <PayDialog
      group={membership.group}
      balanceCents={balance}
      nextSessionEstimateCents={estimate}
      trigger={<Button variant={variant ?? (balance < 0 ? 'default' : 'secondary')}>{copy.payments.pay}</Button>}
    />
  )
}
