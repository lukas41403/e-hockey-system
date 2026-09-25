import QRCode from 'qrcode'
import { encodePayBySquare } from '@/lib/payments/paybysquare'
import { encodeSpd } from '@/lib/payments/spd'
import type { PaymentQrData } from '@/lib/payments/types'

/** Slovak groups use PAY by square, Czech groups QR Platba (SPD). */
export function paymentQrPayload(country: 'SK' | 'CZ', data: PaymentQrData): string {
  return country === 'SK' ? encodePayBySquare(data) : encodeSpd(data)
}

export function renderQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 })
}
