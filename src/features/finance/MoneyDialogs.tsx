import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useGroupMoneyActions } from '@/features/finance/groupApi'
import type { Member } from '@/features/groups/api'
import { copy } from '@/lib/copy'
import { parseMoneyInput, type Currency } from '@/lib/money'

function MemberSelect({ members, value, onChange }: { members: Member[]; value: string; onChange: (value: string) => void }) {
  return (
    <FormField id="money-member" label={copy.groupFinance.cashMember}>
      {(c) => (
        <NativeSelect {...c} value={value} onChange={(e) => onChange(e.target.value)} required>
          <option value="" disabled>
            {copy.sessions.admin.searchMember}
          </option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.profile?.full_name}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  )
}

export function CashDialog({ groupId, currency, members, trigger }: { groupId: string; currency: Currency; members: Member[]; trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { cash } = useGroupMoneyActions(groupId)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setUserId('')
          setAmount('')
          setNote('')
          setError(null)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.groupFinance.cashTitle}</DialogTitle>
          <DialogDescription className="sr-only">{copy.groupFinance.cashTitle}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            const cents = parseMoneyInput(amount)
            if (!userId || !cents) {
              setError(copy.payments.invalidAmount)
              return
            }
            cash.mutate(
              { userId, amountCents: cents, note: note.trim() || null },
              {
                onSuccess: () => {
                  toast.success(copy.groupFinance.cashRecorded)
                  setOpen(false)
                },
              },
            )
          }}
        >
          <MemberSelect members={members} value={userId} onChange={setUserId} />
          <FormField id="cash-amount" label={copy.payments.amount} error={error ?? undefined}>
            {(c) => <MoneyInput {...c} currency={currency} value={amount} onChange={(e) => setAmount(e.target.value)} />}
          </FormField>
          <FormField id="cash-note" label={copy.groupFinance.cashNote} optional>
            {(c) => <Input {...c} value={note} onChange={(e) => setNote(e.target.value)} />}
          </FormField>
          <Button type="submit" size="lg" disabled={cash.isPending || !userId}>
            {copy.groupFinance.cash}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AdjustmentDialog({ groupId, currency, members, trigger }: { groupId: string; currency: Currency; members: Member[]; trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { adjustment } = useGroupMoneyActions(groupId)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setUserId('')
          setAmount('')
          setNote('')
          setDirection('credit')
          setError(null)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.groupFinance.adjustmentTitle}</DialogTitle>
          <DialogDescription>{copy.groupFinance.adjustmentHint}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            const cents = parseMoneyInput(amount)
            if (!userId || !cents) {
              setError(copy.payments.invalidAmount)
              return
            }
            if (!note.trim()) {
              setError(copy.groupFinance.adjustmentHint)
              return
            }
            adjustment.mutate(
              { userId, amountCents: direction === 'credit' ? cents : -cents, note: note.trim() },
              {
                onSuccess: () => {
                  toast.success(copy.groupFinance.adjustmentRecorded)
                  setOpen(false)
                },
              },
            )
          }}
        >
          <MemberSelect members={members} value={userId} onChange={setUserId} />
          <ToggleGroup type="single" value={direction} onValueChange={(v) => v && setDirection(v as 'credit' | 'debit')} aria-label="Smer opravy">
            <ToggleGroupItem value="credit">Pridať kredit</ToggleGroupItem>
            <ToggleGroupItem value="debit">Pridať dlh</ToggleGroupItem>
          </ToggleGroup>
          <FormField id="adj-amount" label={copy.payments.amount}>
            {(c) => <MoneyInput {...c} currency={currency} value={amount} onChange={(e) => setAmount(e.target.value)} />}
          </FormField>
          <FormField id="adj-note" label={copy.groupFinance.cashNote} error={error ?? undefined}>
            {(c) => <Input {...c} value={note} onChange={(e) => setNote(e.target.value)} required />}
          </FormField>
          <Button type="submit" size="lg" disabled={adjustment.isPending || !userId}>
            {copy.groupFinance.adjustment}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
