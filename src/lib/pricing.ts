// Price per paying skater. The binding price is computed by the database at finalization
// (private.skater_price); this copy only produces estimates for the UI. Both implementations
// share the same test cases (supabase/tests/001_pricing.sql, src/lib/pricing.test.ts).

export type PricingMode = 'fixed' | 'dynamic'

export interface PriceInput {
  pricingMode: PricingMode
  pricePerSkaterCents: number | null
  iceCostCents: number
  goalieFeeCents: number
  goaliesAttended: number
  payers: number
  roundingStepCents: number
}

export function skaterPrice(input: PriceInput): number | null {
  if (input.payers <= 0) return null
  if (input.pricingMode === 'fixed') return input.pricePerSkaterCents
  const total = input.iceCostCents + input.goalieFeeCents * input.goaliesAttended
  const unit = input.payers * input.roundingStepCents
  return Math.ceil(total / unit) * input.roundingStepCents
}

export interface SessionPricing {
  pricing_mode: PricingMode
  price_per_skater_cents: number | null
  ice_cost_cents: number
  goalie_fee_cents: number
  rounding_step_cents: number
  skater_capacity: number
  goalie_slots: number
}

export interface PriceEstimate {
  /** Price with the players registered right now (confirmed + late cancelled pay). */
  current: number | null
  /** Price when the session is full. */
  full: number | null
}

export function estimateSessionPrice(
  session: SessionPricing,
  counts: { payingSkaters: number; confirmedGoalies: number },
): PriceEstimate {
  const base = {
    pricingMode: session.pricing_mode,
    pricePerSkaterCents: session.price_per_skater_cents,
    iceCostCents: session.ice_cost_cents,
    goalieFeeCents: session.goalie_fee_cents,
    roundingStepCents: session.rounding_step_cents,
  }
  return {
    current: skaterPrice({ ...base, goaliesAttended: counts.confirmedGoalies, payers: counts.payingSkaters }),
    full: skaterPrice({ ...base, goaliesAttended: session.goalie_slots, payers: session.skater_capacity }),
  }
}
