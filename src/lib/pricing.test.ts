import { describe, expect, it } from 'vitest'
import { estimateSessionPrice, skaterPrice, type PriceInput } from './pricing'

// Same cases as supabase/tests/001_pricing.sql.
const dynamic = (overrides: Partial<PriceInput>): PriceInput => ({
  pricingMode: 'dynamic',
  pricePerSkaterCents: null,
  iceCostCents: 18000,
  goalieFeeCents: 1500,
  goaliesAttended: 2,
  payers: 20,
  roundingStepCents: 50,
  ...overrides,
})

describe('skaterPrice', () => {
  it.each([
    ['ice 180, 2 goalies x 15, 20 payers -> 10.50', dynamic({}), 1050],
    ['19 payers -> 11.50 (210 / 19 = 11.05)', dynamic({ payers: 19 }), 1150],
    ['only 1 goalie, 20 payers -> 10.00 (195 / 20 = 9.75)', dynamic({ goaliesAttended: 1 }), 1000],
    ['0 payers -> nothing charged', dynamic({ payers: 0 }), null],
    ['exact division is not rounded up', dynamic({ iceCostCents: 20000, goalieFeeCents: 0, goaliesAttended: 0 }), 1000],
    ['CZK step 10 Kc -> 270 Kc', dynamic({ iceCostCents: 450000, goalieFeeCents: 40000, roundingStepCents: 1000 }), 27000],
    ['no costs -> 0', dynamic({ iceCostCents: 0, goalieFeeCents: 0 }), 0],
    ['fixed price', dynamic({ pricingMode: 'fixed', pricePerSkaterCents: 1200, payers: 7 }), 1200],
    ['fixed price with 0 payers', dynamic({ pricingMode: 'fixed', pricePerSkaterCents: 1200, payers: 0 }), null],
  ])('%s', (_, input, expected) => {
    expect(skaterPrice(input)).toBe(expected)
  })
})

describe('estimateSessionPrice', () => {
  it('gives the current and the full-capacity estimate', () => {
    const session = {
      pricing_mode: 'dynamic' as const,
      price_per_skater_cents: null,
      ice_cost_cents: 18000,
      goalie_fee_cents: 1500,
      rounding_step_cents: 50,
      skater_capacity: 20,
      goalie_slots: 2,
    }
    expect(estimateSessionPrice(session, { payingSkaters: 14, confirmedGoalies: 1 })).toEqual({
      current: 1400, // 195 / 14 = 13.93 -> 14.00
      full: 1050,
    })
  })
})
