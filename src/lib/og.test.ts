import { describe, expect, it } from 'vitest'
import { injectOgTags, postOgMeta } from './og'

const SHELL = `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Termíny ľadu" />
    <meta property="og:title" content="Partička" />
    <meta property="og:description" content="Termíny ľadu" />
    <meta property="og:image" content="/og-image.png" />
    <title>Partička</title>
  </head>
  <body><div id="root"></div></body>
</html>`

describe('injectOgTags', () => {
  it('replaces title, description and OG tags', () => {
    const html = injectOgTags(SHELL, {
      title: 'Štvrtková partička Nitra hľadá brankára',
      description: 'štvrtok 2. októbra, 20:30',
      url: 'https://particka.app/burza/1',
      image: 'https://particka.app/og-image.png',
    })
    expect(html).toContain('<title>Štvrtková partička Nitra hľadá brankára</title>')
    expect(html).toContain('<meta property="og:title" content="Štvrtková partička Nitra hľadá brankára" />')
    expect(html).toContain('<meta property="og:url" content="https://particka.app/burza/1" />')
    expect(html.match(/og:title/g)).toHaveLength(1)
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/name="description"/g)).toHaveLength(1)
    expect(html).toContain('<div id="root"></div>')
  })
  it('escapes attribute values', () => {
    const html = injectOgTags(SHELL, { title: 'A "B" <c> & d', description: 'x', url: 'https://x' })
    expect(html).toContain('content="A &quot;B&quot; &lt;c&gt; &amp; d"')
  })
  it('leaves documents without a head untouched', () => {
    expect(injectOgTags('<p>hi</p>', { title: 't', description: 'd', url: 'u' })).toBe('<p>hi</p>')
  })
})

describe('postOgMeta', () => {
  const post = {
    group_name: 'Štvrtková partička Nitra',
    venue: 'Zimný štadión Nitra',
    starts_at: '2025-10-02T18:30:00Z',
    offer_skaters: false,
    offer_goalies: true,
    free_skater_spots: null,
    free_goalie_spots: 1,
    pricing_mode: 'dynamic' as const,
    price_per_skater_cents: null,
    estimated_full_price_cents: 1050,
    goalie_fee_cents: 1500,
    currency: 'EUR' as const,
    is_available: true,
  }
  it('describes an open post', () => {
    const meta = postOgMeta(post, 'https://particka.app/burza/1')
    expect(meta.title).toBe('Štvrtková partička Nitra hľadá brankára')
    expect(meta.description.replace(/[\u00a0\u202f]/g, ' ')).toBe(
      'štvrtok 2. októbra, 20:30, Zimný štadión Nitra. Voľné miesta: 1 pre brankára. Odmena pre brankára 15,00 €.',
    )
  })
  it('says when the spots are gone', () => {
    expect(postOgMeta({ ...post, is_available: false }, 'u').description).toContain('Miesta sú už obsadené.')
  })
})
