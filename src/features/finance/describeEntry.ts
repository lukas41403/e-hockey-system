import type { HistoryEntry } from '@/features/finance/api'
import { copy } from '@/lib/copy'
import { formatDayShort } from '@/lib/dates'

/** "Termín št 2. 10.", "Platba VS 1000234", ... */
export function describeEntry(entry: HistoryEntry): string {
  const day = entry.session_starts_at ? formatDayShort(entry.session_starts_at) : ''
  switch (entry.type) {
    case 'charge':
      return entry.late_cancelled ? copy.finance.entry.lateCharge(day) : copy.finance.entry.charge(day)
    case 'goalie_earning':
      return copy.finance.entry.goalie_earning(day)
    case 'topup':
      return entry.method === 'cash' ? copy.finance.entry.topupCash : copy.finance.entry.topup(String(entry.variable_symbol ?? ''))
    case 'goalie_payout':
      return copy.finance.entry.goalie_payout
    case 'reversal':
      return copy.finance.entry.reversal(day)
    case 'adjustment':
      return copy.finance.entry.adjustment(entry.note ?? '')
    default:
      return entry.type
  }
}
