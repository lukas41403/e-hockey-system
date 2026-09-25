import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/States'
import { Skeleton } from '@/components/ui/skeleton'
import { copy } from '@/lib/copy'
import { rpc } from '@/lib/supabase'

export function SuperadminPage() {
  const groups = useQuery({ queryKey: ['admin', 'groups'], queryFn: () => rpc('admin_list_groups', {}) })
  const c = copy.superadmin.columns
  return (
    <div>
      <PageHeader title={copy.superadmin.title} />
      {groups.isPending ? (
        <Skeleton className="h-48" />
      ) : groups.isError ? (
        <ErrorState error={groups.error} />
      ) : (
        <table className="w-full text-left">
          <thead className="border-b border-border text-sm text-muted-foreground">
            <tr>
              <th scope="col" className="py-2 font-semibold">{c.name}</th>
              <th scope="col" className="py-2 font-semibold">{c.city}</th>
              <th scope="col" className="py-2 text-right font-semibold">{c.members}</th>
              <th scope="col" className="py-2 text-right font-semibold">{c.sessions}</th>
            </tr>
          </thead>
          <tbody>
            {groups.data.map((group) => (
              <tr key={group.group_id} className="border-b border-border">
                <td className="py-2.5 font-semibold">{group.name}</td>
                <td className="py-2.5">{group.city}</td>
                <td className="py-2.5 text-right tabular-nums">{group.member_count}</td>
                <td className="py-2.5 text-right tabular-nums">{group.session_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
