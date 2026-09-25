import { afterEach, describe, expect, it, vi } from 'vitest'
import middleware from './middleware'

const POST_ID = '11111111-2222-4333-8444-555555555555'
const SHELL = '<!doctype html><html><head><title>Partička</title><meta property="og:title" content="Partička" /></head><body><div id="root"></div></body></html>'
const POST = {
  group_name: 'Štvrtková partička Nitra',
  venue: 'Zimný štadión Nitra',
  starts_at: '2025-10-02T18:30:00Z',
  offer_skaters: false,
  offer_goalies: true,
  free_skater_spots: null,
  free_goalie_spots: 1,
  pricing_mode: 'dynamic',
  price_per_skater_cents: null,
  estimated_full_price_cents: 1050,
  goalie_fee_cents: 1500,
  currency: 'EUR',
  is_available: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('marketplace OG middleware', () => {
  it('injects post-specific Open Graph tags', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/index.html') ? new Response(SHELL) : new Response(JSON.stringify([POST])),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await middleware(new Request(`https://particka.app/burza/${POST_ID}`))
    const html = await response.text()
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(html).toContain('<meta property="og:title" content="Štvrtková partička Nitra hľadá brankára" />')
    expect(html).toContain(`<meta property="og:url" content="https://particka.app/burza/${POST_ID}" />`)
    expect(html.match(/og:title/g)).toHaveLength(1)
    const rpcCall = fetchMock.mock.calls.find(([input]) => String(input).includes('get_public_post'))
    expect(rpcCall).toBeDefined()
  })

  it('passes through invalid ids without fetching', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await middleware(new Request('https://particka.app/burza/nie-je-uuid'))
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to the plain shell when the post does not exist', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => (String(input).endsWith('/index.html') ? new Response(SHELL) : new Response('[]'))))
    const response = await middleware(new Request(`https://particka.app/burza/${POST_ID}`))
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
})
