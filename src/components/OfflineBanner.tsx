import { WifiOff } from 'lucide-react'
import { copy } from '@/lib/copy'
import { useOnline } from '@/lib/useOnline'

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center gap-2 bg-boards px-4 py-2.5 text-sm text-white">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      {copy.common.offline}
    </div>
  )
}
