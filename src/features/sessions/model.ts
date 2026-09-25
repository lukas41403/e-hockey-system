// Derived view of a session for the UI. The database stays the source of truth; this only
// groups registrations and computes estimates for display.
import { addHours, toDateTimeLocalValue } from '@/lib/dates'
import { estimateSessionPrice, type PriceEstimate } from '@/lib/pricing'
import type { Group, Profile, Registration, Session } from '@/lib/supabase'

export type RosterProfile = Pick<Profile, 'id' | 'full_name' | 'nickname' | 'jersey_number'>
export type RosterRegistration = Registration & { profile: RosterProfile | null }
export type SessionWithRoster = Session & {
  group: Pick<Group, 'id' | 'name' | 'currency' | 'country' | 'city' | 'whatsapp_invite_url'>
  registrations: RosterRegistration[]
}

const byQueue = (a: Registration, b: Registration) =>
  a.created_at === b.created_at ? a.seq - b.seq : a.created_at < b.created_at ? -1 : 1

export interface SessionView {
  confirmedSkaters: RosterRegistration[]
  confirmedGoalies: RosterRegistration[]
  waitlistSkaters: RosterRegistration[]
  waitlistGoalies: RosterRegistration[]
  pending: RosterRegistration[]
  lateCancelled: RosterRegistration[]
  /** My active (pending / confirmed / waitlist) registration, or my late cancellation. */
  mine: RosterRegistration | null
  myWaitlistPosition: number | null
  freeSkaterSpots: number
  freeGoalieSpots: number
  payingSkaters: number
  isStarted: boolean
  isOpen: boolean
  freeCancellationUntil: Date
  isAfterDeadline: boolean
  estimate: PriceEstimate
}

export function viewSession(session: SessionWithRoster, userId: string | null, now: Date = new Date()): SessionView {
  const registrations = [...session.registrations].sort(byQueue)
  const pick = (role: Registration['role'], status: Registration['status']) =>
    registrations.filter((r) => r.role === role && r.status === status)

  const confirmedSkaters = pick('skater', 'confirmed')
  const confirmedGoalies = pick('goalie', 'confirmed')
  const waitlistSkaters = pick('skater', 'waitlist')
  const waitlistGoalies = pick('goalie', 'waitlist')
  const lateCancelled = registrations.filter((r) => r.status === 'late_cancelled')
  const pending = registrations.filter((r) => r.status === 'pending')

  const active = registrations.find(
    (r) => r.user_id === userId && (r.status === 'confirmed' || r.status === 'waitlist' || r.status === 'pending'),
  )
  const mine = active ?? registrations.find((r) => r.user_id === userId && r.status === 'late_cancelled') ?? null
  const queue = mine?.role === 'goalie' ? waitlistGoalies : waitlistSkaters
  const myWaitlistPosition = mine?.status === 'waitlist' ? queue.findIndex((r) => r.id === mine.id) + 1 : null

  const startsAt = new Date(session.starts_at)
  const isStarted = startsAt <= now
  const freeCancellationUntil = addHours(startsAt, -session.cancellation_hours)
  const payingSkaters = confirmedSkaters.length + lateCancelled.filter((r) => r.role === 'skater').length

  return {
    confirmedSkaters,
    confirmedGoalies,
    waitlistSkaters,
    waitlistGoalies,
    pending,
    lateCancelled,
    mine,
    myWaitlistPosition,
    freeSkaterSpots: Math.max(session.skater_capacity - confirmedSkaters.length, 0),
    freeGoalieSpots: Math.max(session.goalie_slots - confirmedGoalies.length, 0),
    payingSkaters,
    isStarted,
    isOpen: session.status === 'scheduled' && !isStarted,
    freeCancellationUntil,
    isAfterDeadline: now >= freeCancellationUntil,
    estimate: estimateSessionPrice(session, {
      payingSkaters: Math.max(payingSkaters, 1),
      confirmedGoalies: confirmedGoalies.length,
    }),
  }
}

/** What happens if I cancel my confirmed registration now (mirrors cancel_registration). */
export function cancellationOutcome(view: SessionView): 'free' | 'replaced' | 'late' {
  if (!view.mine || view.mine.status !== 'confirmed' || !view.isAfterDeadline) return 'free'
  const queue = view.mine.role === 'goalie' ? view.waitlistGoalies : view.waitlistSkaters
  return queue.length > 0 ? 'replaced' : 'late'
}

/** Predicted status of a new registration, for the optimistic update. */
export function predictedStatus(session: Session, view: SessionView, role: Registration['role']): Registration['status'] {
  const free = role === 'skater' ? view.freeSkaterSpots : view.freeGoalieSpots
  const waiting = role === 'skater' ? view.waitlistSkaters.length : view.waitlistGoalies.length
  return free > 0 && waiting === 0 && session.status === 'scheduled' ? 'confirmed' : 'waitlist'
}

/** Next week's slot after the latest session, or tomorrow 20:00 for a new group. */
export function suggestedStart(latestStart: string | null, now: Date = new Date()): string {
  if (latestStart) {
    let next = new Date(latestStart)
    while (next <= now) next = new Date(next.getTime() + 7 * 24 * 3600_000)
    return toDateTimeLocalValue(next)
  }
  const tomorrow = toDateTimeLocalValue(new Date(now.getTime() + 24 * 3600_000))
  return `${tomorrow.slice(0, 10)}T20:00`
}
