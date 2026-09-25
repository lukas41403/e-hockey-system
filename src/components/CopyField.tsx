import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copy } from '@/lib/copy'

/** A value people need to type into another app, with a one-tap copy button. */
export function CopyField({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="font-display-medium text-xl wrap-anywhere">{display ?? value}</div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-primary hover:bg-surface-2"
        aria-label={`${copy.common.copy}: ${label}`}
      >
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        <span aria-live="polite">{copied ? copy.common.copied : copy.common.copy}</span>
      </button>
    </div>
  )
}
