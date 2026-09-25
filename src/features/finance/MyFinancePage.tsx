import { Link } from 'react-router'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyBalances, useMyLedger, type HistoryEntry } from '@/features/finance/api'
import { describeEntry } from '@/features/finance/describeEntry'
import { useMyGroups, type MyGroup } from '@/features/groups/api'
import { PayButton } from '@/features/payments/PayButton'
import { PayDialog } from '@/features/payments/PayDialog'
import { useMyOpenPayments } from '@/features/payments/api'
import { copy } from '@/lib/copy'
import { formatDateTimeShort } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Payment } from '@/lib/supabase'

export function MyFinancePage() {
  const groups = useMyGroups()
  const balances = useMyBalances()
  const ledger = useMyLedger()
  const payments = useMyOpenPayments()

  if (groups.isPending || balances.isPending) return <FinanceSkeleton />
  if (groups.isError) return <ErrorState error={groups.error} onRetry={() => groups.refetch()} />
  if (balances.isError) return <ErrorState error={balances.error} onRetry={() => balances.refetch()} />

  return (
    <div>
      <PageHeader title={copy.finance.title} />
      {groups.data.length === 0 ? (
        <EmptyState
          title={copy.finance.noGroups}
          action={
            <Button asChild>
              <Link to="/partie/nova">{copy.nav.createGroup}</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {groups.data.map((membership) => (
            <GroupFinance
              key={membership.group.id}
              membership={membership}
              balance={balances.data.get(membership.group.id) ?? 0}
              entries={ledger.data?.filter((e) => e.group_id === membership.group.id) ?? null}
              openPayments={payments.data?.filter((p) => p.group_id === membership.group.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupFinance({
  membership,
  balance,
  entries,
  openPayments,
}: {
  membership: MyGroup
  balance: number
  entries: HistoryEntry[] | null
  openPayments: Payment[]
}) {
  const { group } = membership
  const currency = group.currency
  const isGoalie = entries?.some((e) => e.type === 'goalie_earning') ?? false

  return (
    <section aria-labelledby={`fin-${group.id}`}>
      <h2 id={`fin-${group.id}`} className="font-display text-xl">
        {group.name}
      </h2>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="text-sm text-muted-foreground">{copy.finance.balance}</div>
          <Money cents={balance} currency={currency} signed className="font-display text-display" />
          <p className="text-base">
            {balance < 0 ? (
              <span className="font-semibold text-debt">{copy.finance.owes(formatMoney(-balance, currency))}</span>
            ) : balance > 0 ? (
              <span className="text-muted-foreground">
                {isGoalie ? copy.finance.goalieOwed(formatMoney(balance, currency)) : copy.finance.credit(formatMoney(balance, currency))}
              </span>
            ) : (
              <span className="text-muted-foreground">{copy.finance.even}</span>
            )}
          </p>
        </div>
        <PayButton groupId={group.id} variant="default" />
      </div>

      {openPayments.length > 0 && (
        <div className="mt-4">
          <h3 className="pb-1 text-sm font-semibold text-muted-foreground">{copy.payments.pendingTitle}</h3>
          <ul>
            {openPayments.map((payment) => (
              <li key={payment.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2">
                <div>
                  <div className="font-semibold tabular-nums">
                    {formatMoney(payment.amount_cents, currency)} <span className="font-normal text-muted-foreground">VS {payment.variable_symbol}</span>
                  </div>
                  <Badge variant={payment.status === 'reported' ? 'default' : 'neutral'}>{copy.payments.status[payment.status]}</Badge>
                </div>
                <PayDialog
                  group={group}
                  balanceCents={balance}
                  nextSessionEstimateCents={null}
                  existingPayment={payment}
                  trigger={
                    <Button variant="secondary" size="sm">
                      {copy.payments.showQr}
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mt-6 pb-1 text-sm font-semibold text-muted-foreground">{copy.finance.history}</h3>
      {entries === null ? (
        <Skeleton className="h-40" />
      ) : entries.length === 0 ? (
        <p className="border-t border-border py-3 text-muted-foreground">{copy.finance.noHistory}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-2">
              <div className="min-w-0">
                <div className="truncate">{describeEntry(entry)}</div>
                <div className="text-sm text-muted-foreground">{formatDateTimeShort(entry.created_at)}</div>
              </div>
              <Money cents={entry.amount_cents} currency={currency} signed tone="plain" className="shrink-0 font-display-medium text-xl" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function FinanceSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-6 h-10 w-56" />
      <Skeleton className="mb-3 h-6 w-48" />
      <Skeleton className="mb-6 h-20 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
