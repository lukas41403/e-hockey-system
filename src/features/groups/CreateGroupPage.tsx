import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { GroupForm } from '@/features/groups/GroupForm'
import { useCreateGroup } from '@/features/groups/api'
import { copy } from '@/lib/copy'

export function CreateGroupPage() {
  const create = useCreateGroup()
  const navigate = useNavigate()
  return (
    <div className="max-w-xl">
      <PageHeader title={copy.groups.createTitle} subtitle={copy.groups.createIntro} />
      <GroupForm
        submitLabel={copy.groups.create}
        busy={create.isPending}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (group) => {
              toast.success(copy.groups.created)
              navigate(`/partie/${group.id}`)
            },
          })
        }
      />
    </div>
  )
}
