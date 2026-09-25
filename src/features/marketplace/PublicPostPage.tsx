import { Link, useNavigate, useParams } from 'react-router'
import { MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { RinkMark } from '@/components/rink/RinkMark'
import { ShareButtons } from '@/components/ShareButtons'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authContext'
import { loginPath } from '@/features/auth/next'
import { useMyRegistrationOnSession, usePublicPost, useRegisterFromPost } from '@/features/marketplace/api'
import { postPriceText } from '@/features/marketplace/postText'
import { APP_NAME } from '@/lib/app'
import { copy } from '@/lib/copy'
import { formatDateLong, formatTime } from '@/lib/dates'
import { appUrl } from '@/lib/env'
import { formatMoney } from '@/lib/money'
import type { PlayerRole } from '@/lib/supabase'
import { sessionShareText } from '@/lib/whatsapp'

/** Public page of a marketplace post; works without signing in. */
export function PublicPostPage() {
  const { postId } = useParams()
  const { session: authSession, loading } = useAuth()
  const post = usePublicPost(loading ? undefined : postId)

  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <RinkMark className="size-8" />
          <span className="font-display text-xl">{APP_NAME}</span>
        </Link>
        {!authSession && !loading && (
          <Button variant="ghost" asChild>
            <Link to={loginPath(`/burza/${postId}`)}>{copy.auth.signIn}</Link>
          </Button>
        )}
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        {post.isPending ? (
          <div aria-hidden="true">
            <Skeleton className="mb-3 h-8 w-3/4" />
            <Skeleton className="mb-2 h-12 w-40" />
            <Skeleton className="h-32" />
          </div>
        ) : post.isError ? (
          <ErrorState error={post.error} onRetry={() => post.refetch()} />
        ) : !post.data ? (
          <EmptyState
            title={copy.marketplace.publicNotFound}
            action={
              <Button asChild>
                <Link to="/burza">{copy.marketplace.title}</Link>
              </Button>
            }
          />
        ) : (
          <PostContent post={post.data} signedIn={Boolean(authSession)} />
        )}
      </main>
    </div>
  )
}

type PublicPost = NonNullable<ReturnType<typeof usePublicPost>['data']>

function PostContent({ post, signedIn }: { post: PublicPost; signedIn: boolean }) {
  const navigate = useNavigate()
  const mine = useMyRegistrationOnSession(signedIn ? post.session_id : undefined)
  const register = useRegisterFromPost(post.session_id)
  const price = postPriceText(post)
  const url = appUrl(`/burza/${post.post_id}`)
  const title =
    post.offer_goalies && !post.offer_skaters
      ? `${post.group_name} hľadá brankára`
      : copy.marketplace.publicTitle(post.group_name)

  function doRegister(role: PlayerRole) {
    register.mutate(role, {
      onSuccess: (registration) => {
        if (registration.status === 'pending') toast.success(copy.sessions.registeredPending)
        else {
          toast.success(registration.status === 'confirmed' ? copy.sessions.registered : copy.sessions.registeredWaitlist)
          navigate(`/terminy/${post.session_id}`)
        }
      },
    })
  }

  return (
    <article>
      <h1 className="font-display text-title">{title}</h1>
      <p className="mt-3 font-display text-title first-letter:uppercase">{formatDateLong(post.starts_at)}</p>
      <p className="font-display text-display leading-none">{formatTime(post.starts_at)}</p>
      <p className="mt-2 flex items-center gap-1.5 text-base">
        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
        {post.venue}, {post.city}
      </p>

      <dl className="mt-5 grid grid-cols-2 border-t border-border">
        {post.offer_skaters && (
          <div className="border-b border-border py-3">
            <dt className="text-sm text-muted-foreground">Voľné miesta v poli</dt>
            <dd className="font-display text-title">{post.free_skater_spots ?? 0}</dd>
          </div>
        )}
        {post.offer_goalies && (
          <div className="border-b border-border py-3">
            <dt className="text-sm text-muted-foreground">Voľné miesta pre brankárov</dt>
            <dd className="font-display text-title text-goalie-text">{post.free_goalie_spots ?? 0}</dd>
          </div>
        )}
        {post.offer_skaters && price && (
          <div className="border-b border-border py-3">
            <dt className="text-sm text-muted-foreground">{copy.marketplace.price}</dt>
            <dd className="font-semibold">{price}</dd>
          </div>
        )}
        {post.offer_goalies && post.goalie_fee_cents ? (
          <div className="border-b border-border py-3">
            <dt className="text-sm text-muted-foreground">{copy.marketplace.goalieFee}</dt>
            <dd className="font-semibold">{formatMoney(post.goalie_fee_cents, post.currency)}</dd>
          </div>
        ) : null}
      </dl>
      {post.note && <p className="mt-4 measure text-base">{post.note}</p>}
      {post.require_approval && (
        <p className="mt-3">
          <Badge variant="neutral">{copy.marketplace.approvalRequired}</Badge>
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {!post.is_available ? (
          <p className="text-base font-semibold">{copy.marketplace.publicUnavailable}</p>
        ) : !signedIn ? (
          <Button size="lg" asChild>
            <Link to={loginPath(`/burza/${post.post_id}`)}>{copy.marketplace.publicLogin}</Link>
          </Button>
        ) : mine.data ? (
          <div className="flex flex-col items-start gap-3">
            <p className="font-semibold">
              {mine.data.status === 'pending' ? copy.sessions.myStatus.pending : copy.marketplace.alreadyRegistered}
            </p>
            {mine.data.status === 'pending' && <p className="text-muted-foreground">{copy.marketplace.guestPendingInfo}</p>}
            <Button variant="secondary" asChild>
              <Link to={`/terminy/${post.session_id}`}>{copy.marketplace.openSession}</Link>
            </Button>
          </div>
        ) : (
          <>
            {post.offer_skaters && (post.free_skater_spots ?? 0) > 0 && (
              <Button size="lg" disabled={register.isPending || mine.isPending} onClick={() => doRegister('skater')}>
                {copy.marketplace.publicRegisterSkater}
              </Button>
            )}
            {post.offer_goalies && (post.free_goalie_spots ?? 0) > 0 && (
              <Button size="lg" variant="goalie" disabled={register.isPending || mine.isPending} onClick={() => doRegister('goalie')}>
                {copy.marketplace.publicRegisterGoalie}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="mt-6">
        <ShareButtons
          title={title}
          url={url}
          text={sessionShareText({
            groupName: post.group_name,
            startsAt: post.starts_at,
            venue: post.venue,
            freeSkaterSpots: post.offer_skaters ? (post.free_skater_spots ?? 0) : null,
            freeGoalieSpots: post.offer_goalies ? (post.free_goalie_spots ?? 0) : null,
            priceText: post.offer_skaters ? price : null,
            goalieFeeText: post.offer_goalies && post.goalie_fee_cents ? formatMoney(post.goalie_fee_cents, post.currency) : null,
            url,
          })}
        />
      </div>
    </article>
  )
}
