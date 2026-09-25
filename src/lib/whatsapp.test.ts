import { describe, expect, it } from 'vitest'
import {
  isWhatsappInviteUrl,
  paymentReminderText,
  sessionShareText,
  whatsappChatUrl,
  whatsappShareUrl,
} from './whatsapp'

describe('whatsapp links', () => {
  it('encodes diacritics, line breaks and emoji', () => {
    const url = whatsappShareUrl('🏒 Štvrtok\nĽad')
    expect(url).toBe('https://wa.me/?text=%F0%9F%8F%92%20%C5%A0tvrtok%0A%C4%BDad')
    expect(decodeURIComponent(url.split('text=')[1]!)).toBe('🏒 Štvrtok\nĽad')
  })
  it('builds a chat link with digits only', () => {
    expect(whatsappChatUrl('+421 905 123 456', 'Ahoj')).toBe('https://wa.me/421905123456?text=Ahoj')
    expect(whatsappChatUrl('+421905123456')).toBe('https://wa.me/421905123456')
  })
  it('validates group invite links', () => {
    expect(isWhatsappInviteUrl('https://chat.whatsapp.com/KqN8tX2pLm4R7vWz')).toBe(true)
    expect(isWhatsappInviteUrl('http://chat.whatsapp.com/KqN8tX2pLm4R7vWz')).toBe(false)
    expect(isWhatsappInviteUrl('https://example.com/KqN8tX2pLm4R7vWz')).toBe(false)
  })
})

describe('share texts', () => {
  it('describes a session in Slovak', () => {
    const text = sessionShareText({
      groupName: 'Štvrtková partička Nitra',
      startsAt: '2025-10-02T18:30:00Z',
      venue: 'Zimný štadión Nitra',
      freeSkaterSpots: 3,
      freeGoalieSpots: 1,
      priceText: 'približne 10,50 €',
      goalieFeeText: '15,00 €',
      url: 'https://particka.app/terminy/abc',
    })
    expect(text.split('\n')).toEqual([
      '🏒 Štvrtková partička Nitra',
      '📅 štvrtok 2. októbra, 20:30',
      '📍 Zimný štadión Nitra',
      'Voľné miesta v poli: 3',
      'Voľné miesta pre brankárov: 1',
      '💶 Cena: približne 10,50 €',
      '🥅 Odmena pre brankára: 15,00 €',
      '👉 https://particka.app/terminy/abc',
    ])
  })
  it('writes a polite payment reminder', () => {
    const text = paymentReminderText({
      firstName: 'Ľubo',
      amountText: '70,50 €',
      groupName: 'Štvrtková partička Nitra',
      url: 'https://particka.app/financie',
    })
    expect(text).toContain('Ahoj Ľubo')
    expect(text).toContain('70,50 €')
    expect(text).toContain('https://particka.app/financie')
  })
})
