// PAY by square (Slovak banking standard) via the `bysquare` library.
import { decode, encode, PaymentOptions } from 'bysquare/pay'
import { normalizeIban } from '@/lib/iban'
import { toBankText } from '@/lib/payments/text'
import type { PaymentQrData } from '@/lib/payments/types'

export function encodePayBySquare(data: PaymentQrData): string {
  return encode({
    payments: [
      {
        type: PaymentOptions.PaymentOrder,
        amount: data.amountCents / 100,
        currencyCode: data.currency,
        variableSymbol: data.variableSymbol,
        paymentNote: toBankText(data.message, 140),
        beneficiary: { name: toBankText(data.beneficiaryName, 70) },
        bankAccounts: [{ iban: normalizeIban(data.iban) }],
      },
    ],
  })
}

export function decodePayBySquare(qr: string): PaymentQrData {
  const payment = decode(qr).payments[0]
  if (!payment) throw new Error('QR neobsahuje platbu')
  return {
    iban: payment.bankAccounts[0]?.iban ?? '',
    amountCents: Math.round((payment.amount ?? 0) * 100),
    currency: payment.currencyCode as PaymentQrData['currency'],
    variableSymbol: payment.variableSymbol ?? '',
    message: payment.paymentNote ?? '',
    beneficiaryName: payment.beneficiary?.name ?? '',
  }
}
