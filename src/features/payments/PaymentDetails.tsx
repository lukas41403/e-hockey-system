import { useQuery } from '@tanstack/react-query'
import { CopyField } from '@/components/CopyField'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '@/lib/copy'
import { formatIban } from '@/lib/iban'
import { formatAmountForBank, formatMoney, type Currency } from '@/lib/money'
import type { PaymentQrData } from '@/lib/payments/types'

export interface PaymentDetailsData {
  country: 'SK' | 'CZ'
  iban: string
  beneficiaryName: string
  amountCents: number
  currency: Currency
  variableSymbol: string
  message: string
}

/** QR code for banking apps plus every field with a copy button (the QR cannot be scanned on the same phone). */
export function PaymentDetails({ data }: { data: PaymentDetailsData }) {
  const qrData: PaymentQrData = {
    iban: data.iban,
    amountCents: data.amountCents,
    currency: data.currency,
    variableSymbol: data.variableSymbol,
    message: data.message,
    beneficiaryName: data.beneficiaryName,
  }
  const qr = useQuery({
    queryKey: ['payment-qr', data.country, qrData],
    staleTime: Infinity,
    queryFn: async () => {
      const { paymentQrPayload, renderQrSvg } = await import('@/lib/payments/qr')
      const svg = await renderQrSvg(paymentQrPayload(data.country, qrData))
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    },
  })
  const amount = formatMoney(data.amountCents, data.currency)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-lg bg-white p-3">
          {qr.data ? (
            <img src={qr.data} alt={copy.payments.qrAlt(amount, data.variableSymbol)} className="size-52" />
          ) : (
            <Skeleton className="size-52 bg-slate-200" />
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {data.country === 'SK' ? 'PAY by square' : 'QR Platba'}. {copy.payments.qrHint}
        </p>
      </div>
      <div>
        <CopyField label={copy.payments.iban} value={data.iban} display={formatIban(data.iban)} />
        <CopyField label={copy.payments.recipient} value={data.beneficiaryName} />
        <CopyField label={copy.payments.amount} value={formatAmountForBank(data.amountCents).replace('.', ',')} display={amount} />
        <CopyField label={copy.payments.variableSymbol} value={data.variableSymbol} />
        <CopyField label={copy.payments.message} value={data.message} />
      </div>
    </div>
  )
}
