// Open Graph tags for link previews of marketplace posts. Pure functions, used by the
// Vercel middleware (middleware.ts) and covered by unit tests.
import { formatDateTimeLong } from '@/lib/dates'
import { formatMoney, type Currency } from '@/lib/money'

export interface OgMeta {
  title: string
  description: string
  url: string
  image?: string
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const REPLACED_TAGS = [
  /<title>[\s\S]*?<\/title>\s*/i,
  /<meta\s+name="description"[^>]*>\s*/gi,
  /<meta\s+property="og:(title|description|url|image)"[^>]*>\s*/gi,
  /<meta\s+name="twitter:(title|description)"[^>]*>\s*/gi,
]

/** Replaces title, description and OG tags of the SPA shell with post-specific ones. */
export function injectOgTags(html: string, meta: OgMeta): string {
  if (!/<\/head>/i.test(html)) return html
  let result = html
  for (const pattern of REPLACED_TAGS) result = result.replace(pattern, '')
  const title = escapeAttribute(meta.title)
  const description = escapeAttribute(meta.description)
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeAttribute(meta.url)}" />`,
    meta.image ? `<meta property="og:image" content="${escapeAttribute(meta.image)}" />` : '',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ].filter(Boolean)
  return result.replace(/<\/head>/i, `    ${tags.join('\n    ')}\n  </head>`)
}

export interface PublicPostForOg {
  group_name: string
  venue: string
  starts_at: string
  offer_skaters: boolean
  offer_goalies: boolean
  free_skater_spots: number | null
  free_goalie_spots: number | null
  pricing_mode: 'fixed' | 'dynamic'
  price_per_skater_cents: number | null
  estimated_full_price_cents: number | null
  goalie_fee_cents: number | null
  currency: Currency
  is_available: boolean
}

export function postOgMeta(post: PublicPostForOg, url: string, image?: string): OgMeta {
  const wanted =
    post.offer_goalies && !post.offer_skaters
      ? 'hľadá brankára'
      : post.offer_skaters && !post.offer_goalies
        ? 'hľadá hráčov'
        : 'hľadá hráčov aj brankára'
  const parts = [`${formatDateTimeLong(post.starts_at)}, ${post.venue}.`]
  if (!post.is_available) {
    parts.push('Miesta sú už obsadené.')
  } else {
    const spots: string[] = []
    if (post.offer_skaters && post.free_skater_spots) spots.push(`${post.free_skater_spots} v poli`)
    if (post.offer_goalies && post.free_goalie_spots) spots.push(`${post.free_goalie_spots} pre brankára`)
    if (spots.length) parts.push(`Voľné miesta: ${spots.join(', ')}.`)
    const price = post.pricing_mode === 'fixed' ? post.price_per_skater_cents : post.estimated_full_price_cents
    if (post.offer_skaters && price) {
      parts.push(`${post.pricing_mode === 'fixed' ? 'Cena' : 'Cena približne'} ${formatMoney(price, post.currency)}.`)
    }
    if (post.offer_goalies && post.goalie_fee_cents) {
      parts.push(`Odmena pre brankára ${formatMoney(post.goalie_fee_cents, post.currency)}.`)
    }
  }
  return { title: `${post.group_name} ${wanted}`, description: parts.join(' '), url, image }
}
