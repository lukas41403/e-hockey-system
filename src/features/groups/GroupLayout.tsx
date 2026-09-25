import { NavLink, Outlet, useParams } from 'react-router'
import { cn } from 'cn'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { WhatsappIcon } from '@/components/WhatsappIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InviteDialog } from '@/features/groups/InviteDialog'
import { useMyGroup } from '@/features/groups/api'
import { copy } from '@/lib/copy'
import type { GroupContext } from '@/features/groups/groupContext'

export function GroupLayout() {
  const { groupId } = useParams()
  const { entry, isPending, isError, error, refetch, isAdmin } = useMyGroup(groupId)

  if (isPending) {
    return (
      <div aria-hidden="true">
        <Skeleton className="mb-3 h-10 w-2/3" />
        <Skeleton className="mb-6 h-5 w-1/3" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!entry) return <EmptyState title="Túto partičku nevidíš" body="Nie si jej členom alebo neexistuje." />

  const { group, role } = entry
  const tabs = [
    { to: '', label: copy.groups.tabs.sessions, end: true },
    ...(role !== 'guest' ? [{ to: 'clenovia', label: copy.groups.tabs.members, end: false }] : []),
    ...(isAdmin
      ? [
          { to: 'financie', label: copy.groups.tabs.finance, end: false },
          { to: 'nastavenia', label: copy.groups.tabs.settings, end: false },
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title={group.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            {group.city}
            {role !== 'member' && <Badge variant={role === 'admin' ? 'default' : 'neutral'}>{copy.groups.members[role]}</Badge>}
          </span>
        }
        actions={
          <>
            {group.whatsapp_invite_url && (
              <Button variant="secondary" asChild>
                <a href={group.whatsapp_invite_url} target="_blank" rel="noreferrer">
                  <WhatsappIcon />
                  {copy.common.openWhatsappGroup}
                </a>
              </Button>
            )}
            {isAdmin && <InviteDialog group={group} />}
          </>
        }
      />
      <nav aria-label={group.name} className="mb-5 flex h-11 gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px inline-flex items-center border-b-2 border-transparent px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground',
                isActive && 'border-primary text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ group, role, isAdmin } satisfies GroupContext} />
    </div>
  )
}
