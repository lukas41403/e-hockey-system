// WhatsApp integration is link-only: wa.me share and chat links with prefilled text.
import { formatDateTimeLong } from '@/lib/dates'

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function whatsappChatUrl(phoneE164: string, text?: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`
}

export function isWhatsappInviteUrl(url: string): boolean {
  return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(url.trim())
}

export interface SessionShareInfo {
  groupName: string
  startsAt: string
  venue: string
  freeSkaterSpots: number | null
  freeGoalieSpots: number | null
  priceText: string | null
  goalieFeeText: string | null
  url: string
}

function spotsText(count: number, role: 'skater' | 'goalie'): string {
  if (role === 'skater') {
    if (count === 0) return 'Pole je plné'
    return `Voľné miesta v poli: ${count}`
  }
  if (count === 0) return 'Brankári sú kompletní'
  return `Voľné miesta pre brankárov: ${count}`
}

export function sessionShareText(info: SessionShareInfo): string {
  const lines = [`🏒 ${info.groupName}`, `📅 ${formatDateTimeLong(info.startsAt)}`, `📍 ${info.venue}`]
  if (info.freeSkaterSpots !== null) lines.push(spotsText(info.freeSkaterSpots, 'skater'))
  if (info.freeGoalieSpots !== null) lines.push(spotsText(info.freeGoalieSpots, 'goalie'))
  if (info.priceText) lines.push(`💶 Cena: ${info.priceText}`)
  if (info.goalieFeeText) lines.push(`🥅 Odmena pre brankára: ${info.goalieFeeText}`)
  lines.push(`👉 ${info.url}`)
  return lines.join('\n')
}

export function paymentReminderText(input: {
  firstName: string
  amountText: string
  groupName: string
  url: string
}): string {
  return [
    `Ahoj ${input.firstName}, v partičke ${input.groupName} máš nedoplatok ${input.amountText}.`,
    `Zaplatiť môžeš v appke cez QR kód: ${input.url}`,
    'Vďaka! 🏒',
  ].join('\n')
}

export function contactAdminText(groupName: string): string {
  return `Ahoj, píšem ohľadom partičky ${groupName}.`
}

export function contactGuestText(groupName: string, sessionText: string): string {
  return `Ahoj, píšem z partičky ${groupName} ohľadom termínu ${sessionText}.`
}
