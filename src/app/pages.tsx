import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { RinkMark } from '@/components/rink/RinkMark'
import { Button } from '@/components/ui/button'
import { copy } from '@/lib/copy'
import { GENERIC_ERROR } from '@/lib/errors'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="font-display text-title">{copy.common.notFoundTitle}</h1>
      <p className="text-base text-muted-foreground">{copy.common.notFoundBody}</p>
      <Button asChild>
        <Link to="/">{copy.common.goHome}</Link>
      </Button>
    </div>
  )
}

export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (!notFound) console.error('Route error', error)
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <RinkMark className="size-10" />
      <h1 className="font-display text-title">{notFound ? copy.common.notFoundTitle : GENERIC_ERROR}</h1>
      <p className="text-base text-muted-foreground">{notFound ? copy.common.notFoundBody : 'Obnov stránku. Ak sa to opakuje, skús to neskôr.'}</p>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>{copy.common.retry}</Button>
        <Button variant="secondary" asChild>
          <a href="/">{copy.common.goHome}</a>
        </Button>
      </div>
    </main>
  )
}
