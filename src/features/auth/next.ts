/** Only same-origin paths may be used as a redirect target after sign-in. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}

export function loginPath(next: string): string {
  return next === '/' ? '/prihlasenie' : `/prihlasenie?next=${encodeURIComponent(next)}`
}
