import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvitePreview, useJoinGroup } from '@/features/groups/api'
import { copy } from '@/lib/copy'

export function InvitePage() {
  const { code } = useParams()
  const preview = useInvitePreview(code)
  const join = useJoinGroup()
  const navigate = useNavigate()

  if (preview.isPending) {
    return (
      <div aria-hidden="true">
        <Skeleton className="mb-2 h-5 w-40" />
        <Skeleton className="mb-4 h-10 w-3/4" />
        <Skeleton className="h-12 w-56" />
      </div>
    )
  }
  if (preview.isError) return <ErrorState error={preview.error} onRetry={() => preview.refetch()} />
  if (!preview.data) {
    return (
      <EmptyState
        title={copy.invite.invalidTitle}
        body={copy.invite.invalidBody}
        action={
          <Button variant="secondary" asChild>
            <Link to="/">{copy.common.goHome}</Link>
          </Button>
        }
      />
    )
  }

  const group = preview.data
  return (
    <div className="max-w-xl">
      <p className="text-sm font-semibold text-muted-foreground">{copy.invite.title}</p>
      <h1 className="mt-1 font-display text-display">{group.name}</h1>
      <p className="mt-1 text-base text-muted-foreground">
        {group.city}, {copy.invite.members(group.member_count)}
      </p>
      <div className="mt-6">
        {group.is_member ? (
          <div className="flex flex-col items-start gap-3">
            <p>{copy.invite.alreadyMember}</p>
            <Button asChild>
              <Link to={`/partie/${group.group_id}`}>{copy.invite.openGroup}</Link>
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            disabled={join.isPending}
            onClick={() =>
              join.mutate(code!, {
                onSuccess: (groupId) => {
                  toast.success(copy.invite.joined)
                  navigate(`/partie/${groupId}`, { replace: true })
                },
              })
            }
          >
            {copy.invite.join}
          </Button>
        )}
      </div>
    </div>
  )
}
