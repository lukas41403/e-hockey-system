import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PaymentDetails } from '@/features/payments/PaymentDetails'
import { useCancelPayment, useCreatePaymentRequest, useReportPayment } from '@/features/payments/api'
import { copy } from '@/lib/copy'
import { formatMoney, parseMoneyInput, quickTopUpAmounts } from '@/lib/money'
import type { Group, Payment } from '@/lib/supabase'

interface Suggestion {
  label: string
  cents: number
}

export function PayDialog({
  group,
  balanceCents,
  nextSessionEstimateCents,
  existingPayment,
  trigger,
}: {
  group: Pick<Group, 'id' | 'name' | 'country' | 'currency' | 'iban' | 'account_holder_name'>
  balanceCents: number
  nextSessionEstimateCents: number | null
  existingPayment?: Payment
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(existingPayment ?? null)
  const [custom, setCustom] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const create = useCreatePaymentRequest()
  const report = useReportPayment()
  const cancel = useCancelPayment()
  const currency = group.currency

  const suggestions: Suggestion[] = []
  if (balanceCents < 0) suggestions.push({ label: copy.payments.suggestedDebt, cents: -balanceCents })
  else if (nextSessionEstimateCents) suggestions.push({ label: copy.payments.suggestedNext, cents: nextSessionEstimateCents })
  for (const cents of quickTopUpAmounts(currency)) {
    if (!suggestions.some((s) => s.cents === cents)) suggestions.push({ label: copy.payments.topUp, cents })
  }

  function reset() {
    setPayment(existingPayment ?? null)
    setCustom('')
    setSelected(suggestions[0]?.cents ?? null)
    setError(null)
  }

  function onContinue() {
    const amount = custom.trim() !== '' ? parseMoneyInput(custom) : selected
    if (!amount || amount <= 0) {
      setError(copy.payments.invalidAmount)
      return
    }
    create.mutate({ groupId: group.id, amountCents: amount }, { onSuccess: setPayment })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset()
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{payment ? copy.payments.qrTitle : copy.payments.payTitle}</DialogTitle>
          <DialogDescription>
            {group.name}
            {balanceCents < 0 && !payment ? `. ${copy.payments.debt(formatMoney(-balanceCents, currency))}.` : ''}
          </DialogDescription>
        </DialogHeader>

        {!payment ? (
          <div className="flex flex-col gap-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{copy.payments.amountTitle}</legend>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((suggestion) => {
                  const active = custom === '' && selected === suggestion.cents
                  return (
                    <button
                      key={`${suggestion.label}-${suggestion.cents}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setSelected(suggestion.cents)
                        setCustom('')
                        setError(null)
                      }}
                      className={cn(
                        'flex min-h-16 flex-col items-start justify-center rounded-md border px-3 py-2 text-left',
                        active ? 'border-primary bg-accent text-accent-foreground' : 'border-input hover:bg-surface-2',
                      )}
                    >
                      <span className="font-display text-xl">{formatMoney(suggestion.cents, currency)}</span>
                      <span className="text-xs text-muted-foreground">{suggestion.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <FormField id="custom-amount" label={copy.payments.customAmount} error={error ?? undefined}>
              {(c) => (
                <MoneyInput
                  {...c}
                  currency={currency}
                  value={custom}
                  onChange={(event) => {
                    setCustom(event.target.value)
                    setError(null)
                  }}
                />
              )}
            </FormField>
            <Button size="lg" onClick={onContinue} disabled={create.isPending}>
              {copy.payments.continue}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <PaymentDetails
              data={{
                country: group.country,
                iban: group.iban,
                beneficiaryName: group.account_holder_name,
                amountCents: payment.amount_cents,
                currency: payment.currency,
                variableSymbol: String(payment.variable_symbol),
                message: payment.message,
              }}
            />
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              {payment.status === 'pending' && (
                <Button
                  size="lg"
                  disabled={report.isPending}
                  onClick={() =>
                    report.mutate(payment.id, {
                      onSuccess: () => {
                        toast.success(copy.payments.reported)
                        setOpen(false)
                      },
                    })
                  }
                >
                  {copy.payments.iPaid}
                </Button>
              )}
              <Button
                variant="secondary"
                size="lg"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(payment.id, {
                    onSuccess: () => {
                      toast.success(copy.payments.paymentCancelled)
                      setOpen(false)
                    },
                  })
                }
              >
                {copy.payments.cancelPayment}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
