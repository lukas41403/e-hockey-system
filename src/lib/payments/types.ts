import type { Currency } from '@/lib/money'

/** Everything a banking app needs to prefill a transfer. */
export interface PaymentQrData {
  iban: string
  amountCents: number
  currency: Currency
  variableSymbol: string
  message: string
  beneficiaryName: string
}
