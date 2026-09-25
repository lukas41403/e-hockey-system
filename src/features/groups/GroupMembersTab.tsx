import { useState } from 'react'
import { MoreVertical, Shield, UserMinus, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { SectionTitle } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { WhatsappIcon } from '@/components/WhatsappIcon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/authContext'
import { useGroupContext } from '@/features/groups/groupContext'
import { useAdminContacts, useGroupMembers, useMemberPhones, useRemoveMember, useSetMemberRole, type Member } from '@/features/groups/api'
import { InviteDialog } from '@/features/groups/InviteDialog'
import { copy } from '@/lib/copy'
import { formatPhone } from '@/lib/phone'
import { contactAdminText, whatsappChatUrl } from '@/lib/whatsapp'

export function GroupMembersTab() {
  const { group, isAdmin } = useGroupContext()
  const { userId } = useAuth()
  const members = useGroupMembers(group.id)
  const phones = useMemberPhones(group.id, isAdmin)
  const admins = useAdminContacts(group.id)
  const setRole = useSetMemberRole(group.id)
  const remove = useRemoveMember(group.id)
  const [removing, setRemoving] = useState<Member | null>(null)

  if (members.isPending) return <MembersSkeleton />
  if (members.isError) return <ErrorState error={members.error} onRetry={() => members.refetch()} />

  return (
    <div>
      {!isAdmin && admins.data && admins.data.length > 0 && (
        <section aria-labelledby="admin-contacts">
          <h2 id="admin-contacts" className="pb-2 font-display text-xl">
            {copy.groups.members.contactAdmins}
          </h2>
          <ul className="mb-6">
            {admins.data.map((admin) => (
              <li key={admin.user_id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2">
                <span className="font-semibold">{admin.full_name}</span>
                {admin.phone_e164 ? (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={whatsappChatUrl(admin.phone_e164, contactAdminText(group.name))} target="_blank" rel="noreferrer">
                      <WhatsappIcon className="size-4" />
                      {copy.common.writeWhatsapp}
                    </a>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">{copy.groups.members.noPhone}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SectionTitle action={isAdmin ? <InviteDialog group={group} /> : undefined}>
        {copy.groups.members.count(members.data.length)}
      </SectionTitle>
      {members.data.length <= 1 && isAdmin && <EmptyState title={copy.groups.emptyTitle} body={copy.groups.inviteBody} />}
      <ul>
        {members.data.map((member) => {
          const name = member.profile?.full_name ?? ''
          const phone = phones.data?.get(member.user_id)?.phone
          const isMe = member.user_id === userId
          return (
            <li key={member.user_id} className="flex min-h-16 items-center gap-3 border-t border-border py-2">
              <span className="w-9 shrink-0 text-center font-display text-xl text-muted-foreground" aria-hidden="true">
                {member.profile?.jersey_number ?? ''}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold">{name}</span>
                  {isMe && <span className="text-sm text-muted-foreground">({copy.common.you})</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {member.profile?.jersey_number != null && <span className="sr-only">Číslo dresu {member.profile.jersey_number}</span>}
                  {member.profile?.nickname && <span>{member.profile.nickname}</span>}
                  {member.profile?.preferred_role === 'goalie' && <Badge variant="goalie">Brankár</Badge>}
                  {member.role !== 'member' && (
                    <Badge variant={member.role === 'admin' ? 'default' : 'neutral'}>{copy.groups.members[member.role]}</Badge>
                  )}
                  {isAdmin && phone && <span>{formatPhone(phone)}</span>}
                </div>
              </div>
              {isAdmin && phone && !isMe && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={whatsappChatUrl(phone)} target="_blank" rel="noreferrer" aria-label={`${copy.common.writeWhatsapp}: ${name}`}>
                    <WhatsappIcon />
                  </a>
                </Button>
              )}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={copy.groups.members.actions(name)}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.role !== 'admin' && (
                      <DropdownMenuItem
                        onSelect={() => setRole.mutate({ userId: member.user_id, role: 'admin' }, { onSuccess: () => toast.success(copy.groups.members.roleChanged) })}
                      >
                        <Shield />
                        {copy.groups.members.makeAdmin}
                      </DropdownMenuItem>
                    )}
                    {member.role !== 'member' && (
                      <DropdownMenuItem
                        onSelect={() => setRole.mutate({ userId: member.user_id, role: 'member' }, { onSuccess: () => toast.success(copy.groups.members.roleChanged) })}
                      >
                        <UserRound />
                        {copy.groups.members.makeMember}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(member)}>
                      <UserMinus />
                      {copy.groups.members.remove}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          )
        })}
      </ul>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.groups.members.removeConfirmTitle(removing?.profile?.full_name ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>{copy.groups.members.removeConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removing && remove.mutate(removing.user_id, { onSuccess: () => toast.success(copy.groups.members.removed) })}
            >
              {copy.groups.members.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MembersSkeleton() {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex min-h-16 items-center gap-3 border-t border-border py-2">
          <Skeleton className="size-9" />
          <div className="flex-1">
            <Skeleton className="mb-1.5 h-4 w-40" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </li>
      ))}
    </ul>
  )
}
