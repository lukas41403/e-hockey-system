import { useMemo, useState } from 'react'
import { ArrowDownUp, Banknote, Download, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { FormField } from '@/components/FormField'
import { Money } from '@/components/Money'
import { SectionTitle } from '@/components/PageHeader'
import { ErrorState } from '@/components/States'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CashDialog, AdjustmentDialog } from '@/features/finance/MoneyDialogs'
import { GoaliePayouts } from '@/features/finance/GoaliePayouts'
import {
  groupFinanceKeys,
  useGroupFinanceSummary,
  useGroupMoneyActions,
  useMemberFinance,
  usePaymentsToConfirm,
  useSessionResults,
  type MemberFinanceRow,
} from '@/features/finance/groupApi'
import { useGroupMembers, type Member } from '@/features/groups/api'
import { useGroupContext } from '@/features/groups/groupContext'
import { useRealtimeRefresh } from '@/features/sessions/api'
import { copy } from '@/lib/copy'
import { csvAmount, downloadCsv, toCsv } from '@/lib/csv'
import { formatDateTimeShort, formatDayShort, localDateKey } from '@/lib/dates'
import { appUrl } from '@/lib/env'
import { formatMoney, type Currency } from '@/lib/money'
import { firstName } from '@/features/profile/api'
import { paymentReminderText, whatsappChatUrl } from '@/lib/whatsapp'

export function GroupFinanceTab() {
  const { group, isAdmin } = useGroupContext()
  useRealtimeRefresh('group-finance', [{ table: 'payments', filter: `group_id=eq.${group.id}` }], [groupFinanceKeys.all(group.id)])
  const members = useGroupMembers(group.id)
  const names = useMemo(() => new Map((members.data ?? []).map((m) => [m.user_id, m])), [members.data])

  if (!isAdmin) return null
  const currency = group.currency

  return (
    <div className="flex flex-col">
      <Summary groupId={group.id} currency={currency} />
      <PaymentsToConfirm groupId={group.id} currency={currency} />
      <div className="mt-4 flex flex-wrap gap-2">
        <CashDialog groupId={group.id} currency={currency} members={members.data ?? []} trigger={<Button variant="secondary"><Banknote aria-hidden="true" />{copy.groupFinance.cash}</Button>} />
        <AdjustmentDialog groupId={group.id} currency={currency} members={members.data ?? []} trigger={<Button variant="secondary"><Scale aria-hidden="true" />{copy.groupFinance.adjustment}</Button>} />
      </div>
      <GoaliePayouts group={group} names={names} />
      <PlayersTable groupId={group.id} groupName={group.name} currency={currency} names={names} />
      <SessionsTable groupId={group.id} groupName={group.name} currency={currency} />
    </div>
  )
}

function Summary({ groupId, currency }: { groupId: string; currency: Currency }) {
  const summary = useGroupFinanceSummary(groupId)
  if (summary.isPending) return <Skeleton className="h-40" />
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
  const s = summary.data
  if (!s) return null
  const items = [
    { label: copy.groupFinance.collected, value: s.collected_cents ?? 0 },
    { label: copy.groupFinance.paidOut, value: s.paid_out_cents ?? 0 },
    { label: copy.groupFinance.iceTotal, value: s.ice_total_cents ?? 0 },
    { label: copy.groupFinance.debts, value: -(s.debts_cents ?? 0), tone: 'debt' as const },
    { label: copy.groupFinance.credits, value: s.credits_cents ?? 0 },
  ]
  return (
    <section aria-labelledby="finance-summary">
      <h2 id="finance-summary" className="sr-only">
        {copy.groupFinance.summary}
      </h2>
      <div className="border-b border-border pb-4">
        <div className="text-sm text-muted-foreground">{copy.groupFinance.cashAvailable}</div>
        <Money cents={s.cash_available_cents ?? 0} currency={currency} className="font-display text-display" />
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="border-b border-border py-3 pr-3">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className={cn('font-display text-xl', item.tone === 'debt' && item.value < 0 && 'text-debt')}>
              {formatMoney(Math.abs(item.value), currency)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function PaymentsToConfirm({ groupId, currency }: { groupId: string; currency: Currency }) {
  const payments = usePaymentsToConfirm(groupId)
  const actions = useGroupMoneyActions(groupId)
  const [search, setSearch] = useState('')

  const filtered = (payments.data ?? []).filter((payment) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return String(payment.variable_symbol).includes(term) || (payment.profile?.full_name ?? '').toLowerCase().includes(term)
  })

  return (
    <section aria-labelledby="to-confirm">
      <SectionTitle id="to-confirm">{copy.groupFinance.toConfirm}</SectionTitle>
      {(payments.data?.length ?? 0) > 3 && (
        <div className="mb-3">
          <FormField id="payment-search" label={copy.groupFinance.search}>
            {(c) => <Input {...c} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />}
          </FormField>
        </div>
      )}
      {payments.isPending ? (
        <Skeleton className="h-24" />
      ) : payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      ) : filtered.length === 0 ? (
        <p className="border-t border-border py-3 text-muted-foreground">{copy.groupFinance.toConfirmEmpty}</p>
      ) : (
        <ul>
          {filtered.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{payment.profile?.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  VS {payment.variable_symbol}, {formatDateTimeShort(payment.reported_at ?? payment.created_at)}{' '}
                  {payment.status === 'reported' ? (
                    <Badge>{copy.payments.status.reported}</Badge>
                  ) : (
                    <Badge variant="outline">{copy.groupFinance.notReportedYet}</Badge>
                  )}
                </div>
              </div>
              <span className="font-display text-xl">{formatMoney(payment.amount_cents, currency)}</span>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={actions.confirm.isPending}
                  onClick={() => actions.confirm.mutate(payment.id, { onSuccess: () => toast.success(copy.groupFinance.confirmed) })}
                >
                  {copy.groupFinance.confirm}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="flex-1 sm:flex-none">
                      {copy.groupFinance.reject}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{copy.groupFinance.rejectTitle}</AlertDialogTitle>
                      <AlertDialogDescription>{copy.groupFinance.rejectBody}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{copy.common.back}</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => actions.reject.mutate(payment.id, { onSuccess: () => toast.success(copy.groupFinance.rejected) })}
                      >
                        {copy.groupFinance.reject}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type SortKey = 'balance' | 'name' | 'sessions' | 'paid' | 'charged'

function PlayersTable({
  groupId,
  groupName,
  currency,
  names,
}: {
  groupId: string
  groupName: string
  currency: Currency
  names: Map<string, Member>
}) {
  const finance = useMemberFinance(groupId)
  const [sort, setSort] = useState<{ key: SortKey; direction: 1 | -1 }>({ key: 'balance', direction: 1 })

  const rows = useMemo(() => {
    const nameOf = (row: MemberFinanceRow) => names.get(row.userId)?.profile?.full_name ?? ''
    const value = (row: MemberFinanceRow): number | string =>
      sort.key === 'name'
        ? nameOf(row)
        : sort.key === 'sessions'
          ? row.sessionsCount
          : sort.key === 'paid'
            ? row.paidCents
            : sort.key === 'charged'
              ? row.chargedCents
              : row.balanceCents
    return [...(finance.data ?? [])].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      const order = typeof va === 'string' ? va.localeCompare(vb as string, 'sk') : va - (vb as number)
      return order * sort.direction || nameOf(a).localeCompare(nameOf(b), 'sk')
    })
  }, [finance.data, names, sort])

  function header(key: SortKey, label: string, className?: string) {
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'} className={cn('py-2 font-semibold', className)}>
        <button
          type="button"
          className={cn('inline-flex min-h-11 items-center gap-1 text-sm', active ? 'text-foreground' : 'text-muted-foreground')}
          onClick={() => setSort((current) => ({ key, direction: current.key === key ? (current.direction === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))}
        >
          {label}
          <ArrowDownUp className="size-3.5" aria-hidden="true" />
        </button>
      </th>
    )
  }

  function exportCsv() {
    const c = copy.groupFinance.playersColumns
    downloadCsv(
      `${groupName} - hraci - ${localDateKey(new Date())}.csv`,
      toCsv(
        [c.name, c.sessions, c.paid, c.charged, c.balance],
        rows.map((row) => [
          names.get(row.userId)?.profile?.full_name ?? '',
          row.sessionsCount,
          csvAmount(row.paidCents),
          csvAmount(row.chargedCents),
          csvAmount(row.balanceCents),
        ]),
      ),
    )
  }

  const c = copy.groupFinance.playersColumns
  return (
    <section aria-labelledby="players-table">
      <SectionTitle
        id="players-table"
        action={
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!finance.data}>
            <Download aria-hidden="true" />
            {copy.groupFinance.exportCsv}
          </Button>
        }
      >
        {copy.groupFinance.players}
      </SectionTitle>
      {finance.isPending ? (
        <Skeleton className="h-48" />
      ) : finance.isError ? (
        <ErrorState error={finance.error} onRetry={() => finance.refetch()} />
      ) : (
        <table className="w-full text-left">
          <thead className="border-b border-border">
            <tr>
              {header('name', c.name)}
              {header('sessions', c.sessions, 'hidden text-right sm:table-cell')}
              {header('paid', c.paid, 'hidden text-right sm:table-cell')}
              {header('charged', c.charged, 'hidden text-right md:table-cell')}
              {header('balance', c.balance, 'text-right')}
              <th scope="col" className="w-12">
                <span className="sr-only">{copy.groupFinance.remind}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const member = names.get(row.userId)
              const name = member?.profile?.full_name ?? ''
              return (
                <tr key={row.userId} className="border-b border-border">
                  <td className="py-2 pr-2 font-semibold">{name}</td>
                  <td className="hidden py-2 text-right tabular-nums sm:table-cell">{row.sessionsCount}</td>
                  <td className="hidden py-2 text-right tabular-nums sm:table-cell">{formatMoney(row.paidCents, currency)}</td>
                  <td className="hidden py-2 text-right tabular-nums md:table-cell">{formatMoney(row.chargedCents, currency)}</td>
                  <td className="py-2 text-right">
                    <Money cents={row.balanceCents} currency={currency} className={cn('font-semibold', row.balanceCents < 0 && 'font-bold')} />
                  </td>
                  <td className="py-1 text-right">
                    {row.balanceCents < 0 && row.phone && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={whatsappChatUrl(
                            row.phone,
                            paymentReminderText({
                              firstName: firstName(name),
                              amountText: formatMoney(-row.balanceCents, currency),
                              groupName,
                              url: appUrl('/financie'),
                            }),
                          )}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${copy.groupFinance.remind}: ${name}`}
                        >
                          <WhatsappIcon />
                        </a>
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

function SessionsTable({ groupId, groupName, currency }: { groupId: string; groupName: string; currency: Currency }) {
  const sessions = useSessionResults(groupId)
  const c = copy.groupFinance.sessionsColumns

  function exportCsv() {
    downloadCsv(
      `${groupName} - terminy - ${localDateKey(new Date())}.csv`,
      toCsv(
        [c.date, c.skaters, c.goalies, c.charged, c.ice, c.goalieFees, c.result],
        (sessions.data ?? []).map((s) => [
          localDateKey(s.starts_at!),
          s.confirmed_skaters,
          s.attended_goalies,
          csvAmount(s.charged_cents ?? 0),
          csvAmount(s.ice_cost_cents ?? 0),
          csvAmount(s.goalie_earnings_cents ?? 0),
          csvAmount(s.result_cents ?? 0),
        ]),
      ),
    )
  }

  return (
    <section aria-labelledby="sessions-table">
      <SectionTitle
        id="sessions-table"
        action={
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!sessions.data}>
            <Download aria-hidden="true" />
            {copy.groupFinance.exportCsv}
          </Button>
        }
      >
        {copy.groupFinance.sessionsTable}
      </SectionTitle>
      {sessions.isPending ? (
        <Skeleton className="h-40" />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
      ) : sessions.data.length === 0 ? (
        <p className="border-t border-border py-3 text-muted-foreground">Zatiaľ žiadny uzavretý termín.</p>
      ) : (
        <table className="w-full text-left">
          <thead className="border-b border-border text-sm text-muted-foreground">
            <tr>
              <th scope="col" className="py-2 font-semibold">{c.date}</th>
              <th scope="col" className="py-2 text-right font-semibold">{c.skaters}</th>
              <th scope="col" className="hidden py-2 text-right font-semibold sm:table-cell">{c.goalies}</th>
              <th scope="col" className="hidden py-2 text-right font-semibold sm:table-cell">{c.charged}</th>
              <th scope="col" className="hidden py-2 text-right font-semibold md:table-cell">{c.ice}</th>
              <th scope="col" className="hidden py-2 text-right font-semibold md:table-cell">{c.goalieFees}</th>
              <th scope="col" className="py-2 text-right font-semibold">{c.result}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.data.map((s) => (
              <tr key={s.session_id} className="border-b border-border">
                <td className="py-2.5">{formatDayShort(s.starts_at!)}</td>
                <td className="py-2.5 text-right tabular-nums">{s.confirmed_skaters}</td>
                <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">{s.attended_goalies}</td>
                <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">{formatMoney(s.charged_cents ?? 0, currency)}</td>
                <td className="hidden py-2.5 text-right tabular-nums md:table-cell">{formatMoney(s.ice_cost_cents ?? 0, currency)}</td>
                <td className="hidden py-2.5 text-right tabular-nums md:table-cell">{formatMoney(s.goalie_earnings_cents ?? 0, currency)}</td>
                <td className="py-2.5 text-right">
                  <Money cents={s.result_cents ?? 0} currency={currency} signed className="font-semibold" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
