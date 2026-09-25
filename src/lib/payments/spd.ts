// QR Platba / Short Payment Descriptor (Czech Banking Association), version 1.0:
//   SPD*1.0*ACC:{IBAN}*AM:{amount}*CC:CZK*X-VS:{vs}*MSG:{message}*RN:{recipient}
// Fields are separated by '*'; a '*' inside a value must be written as %2A.
import { formatAmountForBank } from '@/lib/money'
import { normalizeIban } from '@/lib/iban'
import { toBankText } from '@/lib/payments/text'
import type { PaymentQrData } from '@/lib/payments/types'

function escapeValue(value: string): string {
  return value.replace(/\*/g, '%2A')
}

export function encodeSpd(data: PaymentQrData): string {
  if (!/^\d{1,10}$/.test(data.variableSymbol)) throw new Error('VS musí mať 1 až 10 číslic')
  const fields = [
    ['ACC', normalizeIban(data.iban)],
    ['AM', formatAmountForBank(data.amountCents)],
    ['CC', data.currency],
    ['X-VS', data.variableSymbol],
    ['MSG', toBankText(data.message, 60)],
    ['RN', toBankText(data.beneficiaryName, 35)],
  ] as const
  return ['SPD', '1.0', ...fields.filter(([, value]) => value !== '').map(([key, value]) => `${key}:${escapeValue(value)}`)].join('*')
}

export function decodeSpd(text: string): PaymentQrData {
  const [header, version, ...fields] = text.split('*')
  if (header !== 'SPD' || version !== '1.0') throw new Error('Nie je to SPD 1.0')
  const values = new Map<string, string>()
  for (const field of fields) {
    const separator = field.indexOf(':')
    if (separator > 0) values.set(field.slice(0, separator), field.slice(separator + 1).replace(/%2A/gi, '*'))
  }
  const [whole = '0', fraction = ''] = (values.get('AM') ?? '0').split('.')
  return {
    iban: values.get('ACC') ?? '',
    amountCents: Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2)),
    currency: (values.get('CC') ?? 'CZK') as PaymentQrData['currency'],
    variableSymbol: values.get('X-VS') ?? '',
    message: values.get('MSG') ?? '',
    beneficiaryName: values.get('RN') ?? '',
  }
}
