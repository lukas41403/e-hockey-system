import { afterEach, describe, expect, it, vi } from 'vitest'
import { GENERIC_ERROR, NETWORK_ERROR, errorCode, getErrorMessage } from './errors'

afterEach(() => vi.restoreAllMocks())

describe('errors', () => {
  it('maps database codes to Slovak messages', () => {
    expect(getErrorMessage({ message: 'SESSION_FULL', code: 'P0001' })).toBe('Termín je plný.')
    expect(getErrorMessage({ message: 'PAYOUT_EXCEEDS_BALANCE' })).toContain('brankárovi dlhuje')
    expect(errorCode({ message: 'LAST_ADMIN' })).toBe('LAST_ADMIN')
  })
  it('maps auth errors', () => {
    expect(getErrorMessage({ code: 'otp_expired', message: 'Token has expired or is invalid' })).toContain('Kód je nesprávny')
  })
  it('recognizes network failures', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_ERROR)
  })
  it('logs unknown errors and shows a generic message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getErrorMessage(new Error('boom'))).toBe(GENERIC_ERROR)
    expect(spy).toHaveBeenCalledOnce()
  })
})
