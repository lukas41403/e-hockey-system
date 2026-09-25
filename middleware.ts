// Vercel Routing Middleware: link previews for public marketplace posts. The SPA shell gets
// post-specific Open Graph tags (group, time, free spots) so WhatsApp and others show them.
import { next } from '@vercel/functions/middleware'
import { injectOgTags, postOgMeta, type PublicPostForOg } from './src/lib/og'

export const config = { matcher: '/burza/:postId' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const postId = url.pathname.split('/')[2] ?? ''
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!UUID.test(postId) || !supabaseUrl || !anonKey) return next()

  try {
    const [shell, postResponse] = await Promise.all([
      fetch(new URL('/index.html', url)),
      fetch(`${supabaseUrl}/rest/v1/rpc/get_public_post`, {
        method: 'POST',
        headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p_post_id: postId }),
      }),
    ])
    if (!shell.ok || !postResponse.ok) return next()
    const [post] = (await postResponse.json()) as PublicPostForOg[]
    if (!post) return next()
    const html = injectOgTags(await shell.text(), postOgMeta(post, url.toString(), new URL('/og-image.png', url).toString()))
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=120' },
    })
  } catch {
    return next()
  }
}
