import { toast } from 'sonner'
import { EmptyState } from '@/components/States'
import { GroupForm } from '@/features/groups/GroupForm'
import { useGroupContext } from '@/features/groups/groupContext'
import { useUpdateGroupSettings } from '@/features/groups/api'
import { copy } from '@/lib/copy'

export function GroupSettingsTab() {
  const { group, isAdmin } = useGroupContext()
  const update = useUpdateGroupSettings(group.id)
  if (!isAdmin) return <EmptyState title="Nastavenia mení len admin" />
  return (
    <div className="max-w-xl">
      <h2 className="sr-only">{copy.groups.settingsTitle}</h2>
      <GroupForm
        key={group.updated_at}
        group={group}
        submitLabel={copy.common.save}
        busy={update.isPending}
        onSubmit={(input) => update.mutate(input, { onSuccess: () => toast.success(copy.groups.settingsSaved) })}
      />
    </div>
  )
}
