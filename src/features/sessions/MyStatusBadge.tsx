import { Badge } from '@/components/ui/badge'
import type { SessionView } from '@/features/sessions/model'

export function MyStatusBadge({ view }: { view: SessionView }) {
  const mine = view.mine
  if (!mine) return null
  if (mine.status === 'confirmed') {
    return <Badge variant={mine.role === 'goalie' ? 'goalie' : 'solid'}>{mine.role === 'goalie' ? 'Chytáš' : 'Hráš'}</Badge>
  }
  if (mine.status === 'waitlist') return <Badge variant="neutral">Čakáš, {view.myWaitlistPosition}.</Badge>
  if (mine.status === 'pending') return <Badge variant="neutral">Čaká na schválenie</Badge>
  if (mine.status === 'late_cancelled') return <Badge variant="debt">Neskoro odhlásený</Badge>
  return null
}
