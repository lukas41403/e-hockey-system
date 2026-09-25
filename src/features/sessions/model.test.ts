import { describe, expect, it } from 'vitest'
import { cancellationOutcome, predictedStatus, viewSession, type RosterRegistration, type SessionWithRoster } from './model'

let seq = 0
function reg(userId: string, role: 'skater' | 'goalie', status: RosterRegistration['status'], minute: number): RosterRegistration {
  seq += 1
  return {
    id: `r-${userId}`,
    seq,
    session_id: 's1',
    group_id: 'g1',
    user_id: userId,
    role,
    status,
    is_guest: false,
    attended: null,
    promoted_at: null,
    promotion_seen_at: null,
    cancel_reason: status === 'cancelled' ? 'self' : null,
    created_at: new Date(Date.UTC(2025, 9, 1, 10, minute)).toISOString(),
    cancelled_at: status === 'late_cancelled' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    created_by: userId,
    profile: { id: userId, full_name: `Hráč ${userId}`, nickname: null, jersey_number: null },
  }
}

function session(registrations: RosterRegistration[], overrides: Partial<SessionWithRoster> = {}): SessionWithRoster {
  return {
    id: 's1',
    group_id: 'g1',
    series_id: null,
    starts_at: '2025-10-02T18:30:00Z',
    ends_at: '2025-10-02T19:45:00Z',
    venue: 'Zimný štadión',
    skater_capacity: 3,
    goalie_slots: 1,
    ice_cost_cents: 18000,
    goalie_fee_cents: 1500,
    pricing_mode: 'dynamic',
    price_per_skater_cents: null,
    rounding_step_cents: 50,
    cancellation_hours: 24,
    status: 'scheduled',
    notes: null,
    final_price_per_skater_cents: null,
    finalized_at: null,
    finalized_by: null,
    cancelled_at: null,
    cancelled_by: null,
    created_by: null,
    created_at: '2025-09-25T10:00:00Z',
    updated_at: '2025-09-25T10:00:00Z',
    group: { id: 'g1', name: 'Partička', currency: 'EUR', country: 'SK', city: 'Nitra', whatsapp_invite_url: null },
    registrations,
    ...overrides,
  }
}

const EARLY = new Date('2025-09-29T12:00:00Z')
const LATE = new Date('2025-10-02T12:00:00Z')

describe('viewSession', () => {
  const roster = [
    reg('a', 'skater', 'confirmed', 1),
    reg('b', 'skater', 'confirmed', 2),
    reg('c', 'skater', 'confirmed', 3),
    reg('d', 'skater', 'waitlist', 4),
    reg('e', 'skater', 'waitlist', 5),
    reg('g', 'goalie', 'confirmed', 6),
    reg('x', 'skater', 'late_cancelled', 0),
  ]

  it('groups the roster and finds my waitlist position', () => {
    const view = viewSession(session(roster), 'e', EARLY)
    expect(view.confirmedSkaters.map((r) => r.user_id)).toEqual(['a', 'b', 'c'])
    expect(view.waitlistSkaters.map((r) => r.user_id)).toEqual(['d', 'e'])
    expect(view.myWaitlistPosition).toBe(2)
    expect(view.freeSkaterSpots).toBe(0)
    expect(view.payingSkaters).toBe(4)
  })

  it('knows the free cancellation deadline', () => {
    expect(viewSession(session(roster), 'a', EARLY).isAfterDeadline).toBe(false)
    expect(viewSession(session(roster), 'a', LATE).isAfterDeadline).toBe(true)
  })

  it('predicts the cancellation outcome like the database', () => {
    expect(cancellationOutcome(viewSession(session(roster), 'a', EARLY))).toBe('free')
    expect(cancellationOutcome(viewSession(session(roster), 'a', LATE))).toBe('replaced')
    expect(cancellationOutcome(viewSession(session(roster), 'g', LATE))).toBe('late')
  })

  it('predicts waitlist for a full session', () => {
    const s = session(roster)
    expect(predictedStatus(s, viewSession(s, 'z', EARLY), 'skater')).toBe('waitlist')
    expect(predictedStatus(s, viewSession(s, 'z', EARLY), 'goalie')).toBe('waitlist')
    const open = session([reg('a', 'skater', 'confirmed', 1)])
    expect(predictedStatus(open, viewSession(open, 'z', EARLY), 'skater')).toBe('confirmed')
  })

  it('estimates the price with the current payers and at full capacity', () => {
    const view = viewSession(session(roster), 'a', EARLY)
    // (180 + 15) / 4 payers = 48.75 -> 49.00; full: (180 + 15) / 3 = 65 -> 65.00
    expect(view.estimate).toEqual({ current: 4900, full: 6500 })
  })
})
