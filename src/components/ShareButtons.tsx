import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WhatsappIcon } from '@/components/WhatsappIcon'
import { copy } from '@/lib/copy'
import { whatsappShareUrl } from '@/lib/whatsapp'

export function ShareButtons({ text, title, url }: { text: string; title: string; url: string }) {
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" asChild>
        <a href={whatsappShareUrl(text)} target="_blank" rel="noreferrer">
          <WhatsappIcon />
          {copy.common.shareWhatsapp}
        </a>
      </Button>
      {canShare && (
        <Button
          variant="secondary"
          onClick={() => {
            navigator.share({ title, text, url }).catch(() => undefined)
          }}
        >
          <Share2 aria-hidden="true" />
          {copy.common.share}
        </Button>
      )}
    </div>
  )
}
