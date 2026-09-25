import { useState } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { SectionTitle } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useGroupMoneyActions, useMemberFinance, type MemberFinanceRow } from '@/features/finance/groupApi'
import type { Member } from '@/features/groups/api'
import { PaymentDetails } from '@/features/payments/PaymentDetails'
import { copy } from '@/lib/copy'
import { centsToInput, formatMoney, parseMoneyInput } from '@/lib/money'
import type { Group, Payment } from '@/lib/supabase'

export function GoaliePayouts({ group, names }: { group: Group; names: Map<string, Member> }) {
  const finance = useMemberFinance(group.id)
  const owed = (finance.data ?? []).filter((row) => row.goalieEarnedCents > 0 && row.balanceCents > 0)

  return (
    <section aria-labelledby="goalie-payouts">
      <SectionTitle id="goalie-payouts">{copy.groupFinance.goalies}</SectionTitle>
      {finance.isSuccess && owed.length === 0 ? (
        <p className="border-t border-border py-3 text-muted-foreground">{copy.groupFinance.goaliesEmpty}</p>
      ) : (
        <ul>
          {owed.map((row) => (
            <li key={row.userId} className="flex min-h-16 items-center justify-between gap-3 border-t border-border py-2">
              <div>
                <div className="font-semibold">{names.get(row.userId)?.profile?.full_name}</div>
                <div className="text-sm text-goalie-text">{copy.finance.goalieOwed(formatMoney(row.balanceCents, group.currency))}</div>
              </div>
              <PayoutDialog group={group} row={row} name={names.get(row.userId)?.profile?.full_name ?? ''} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PayoutDialog({ group, row, name }: { group: Group; row: MemberFinanceRow; name: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'transfer' | 'cash'>('transfer')
  const [error, setError] = useState<string | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const actions = useGroupMoneyActions(group.id)
  const max = row.balanceCents
  const hasIban = Boolean(row.iban)

  function validAmount(): number | null {
    const cents = parseMoneyInput(amount)
    if (!cents || cents <= 0 || cents > max) {
      setError(copy.groupFinance.payoutAmountHint(formatMoney(max, group.currency)))
      return null
    }
    return cents
  }

  function done() {
    toast.success(copy.groupFinance.payoutConfirmed)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setAmount(centsToInput(max))
          setMethod(hasIban ? 'transfer' : 'cash')
          setPayment(null)
          setError(null)
        } else if (payment && payment.status === 'pending') {
          actions.cancelPayout.mutate(payment.id)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="goalie" size="sm">
          {copy.groupFinance.payOut}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.groupFinance.payoutTitle(name)}</DialogTitle>
          <DialogDescription>{copy.finance.goalieOwed(formatMoney(max, group.currency))}</DialogDescription>
        </DialogHeader>
        {!payment ? (
          <div className="flex flex-col gap-4">
            <FormField id="payout-amount" label={copy.payments.amount} hint={copy.groupFinance.payoutAmountHint(formatMoney(max, group.currency))} error={error ?? undefined}>
              {(c) => <MoneyInput {...c} currency={group.currency} value={amount} onChange={(e) => { setAmount(e.target.value); setError(null) }} />}
            </FormField>
            <ToggleGroup type="single" value={method} onValueChange={(v) => v && setMethod(v as 'transfer' | 'cash')} aria-label="Spôsob vyplatenia">
              <ToggleGroupItem value="transfer" disabled={!hasIban}>
                {copy.groupFinance.payoutTransfer}
              </ToggleGroupItem>
              <ToggleGroupItem value="cash">{copy.groupFinance.payoutCash}</ToggleGroupItem>
            </ToggleGroup>
            {!hasIban && <p className="measure text-sm text-muted-foreground">{copy.groupFinance.payoutNoIban}</p>}
            {method === 'transfer' ? (
              <Button
                size="lg"
                disabled={actions.createPayout.isPending}
                onClick={() => {
                  const cents = validAmount()
                  if (cents) actions.createPayout.mutate({ userId: row.userId, amountCents: cents, method: 'transfer' }, { onSuccess: setPayment })
                }}
              >
                {copy.groupFinance.payoutPrepare}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="goalie"
                disabled={actions.createPayout.isPending || actions.confirmPayout.isPending}
                onClick={() => {
                  const cents = validAmount()
                  if (!cents) return
                  actions.createPayout.mutate(
                    { userId: row.userId, amountCents: cents, method: 'cash' },
                    { onSuccess: (created) => actions.confirmPayout.mutate(created.id, { onSuccess: done }) },
                  )
                }}
              >
                {copy.groupFinance.payoutCash}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <PaymentDetails
              data={{
                country: row.iban?.startsWith('CZ') ? 'CZ' : 'SK',
                iban: row.iban ?? '',
                beneficiaryName: name,
                amountCents: payment.amount_cents,
                currency: payment.currency,
                variableSymbol: String(payment.variable_symbol),
                message: payment.message,
              }}
            />
            <Button
              size="lg"
              variant="goalie"
              disabled={actions.confirmPayout.isPending}
              onClick={() => actions.confirmPayout.mutate(payment.id, { onSuccess: () => { setPayment({ ...payment, status: 'confirmed' }); done() } })}
            >
              {copy.groupFinance.payoutDone}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
