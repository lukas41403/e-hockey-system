import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useCreateSessions, useUpdateSession, type SessionInput } from '@/features/sessions/api'
import { suggestedStart } from '@/features/sessions/model'
import { copy } from '@/lib/copy'
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/dates'
import { centsToInput, parseMoneyInput } from '@/lib/money'
import type { Group, Session } from '@/lib/supabase'

const money = (message: string) => z.string().trim().refine((v) => parseMoneyInput(v) !== null, message)
const intRange = (min: number, max: number, message: string) =>
  z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, message)

const schema = z
  .object({
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Zadaj dátum a čas začiatku.'),
    durationMinutes: intRange(15, 300, 'Dĺžka musí byť od 15 do 300 minút.'),
    venue: z.string().trim().min(1, 'Zadaj miesto.').max(120),
    skaterCapacity: intRange(1, 100, 'Zadaj 1 až 100 hráčov.'),
    goalieSlots: intRange(0, 4, 'Zadaj 0 až 4 brankárov.'),
    iceCost: money('Zadaj cenu ľadu.'),
    goalieFee: money('Zadaj odmenu brankára.'),
    pricingMode: z.enum(['dynamic', 'fixed']),
    pricePerSkater: z.string().trim(),
    cancellationHours: intRange(0, 168, 'Zadaj 0 až 168 hodín.'),
    notes: z.string().trim().max(500),
    repeat: z.boolean(),
    repeatWeeks: intRange(1, 12, 'Opakovať môžeš 1 až 12 týždňov.'),
  })
  .refine((v) => v.pricingMode === 'dynamic' || (parseMoneyInput(v.pricePerSkater) ?? 0) > 0, {
    path: ['pricePerSkater'],
    message: 'Pri fixnej cene zadaj cenu pre hráča.',
  })

type FormValues = z.infer<typeof schema>

export function SessionFormDialog({
  group,
  session,
  latestStart,
  trigger,
}: {
  group: Pick<Group, 'id' | 'currency' | 'default_venue' | 'default_duration_minutes' | 'default_skater_capacity' | 'default_goalie_slots' | 'default_ice_cost_cents' | 'default_goalie_fee_cents' | 'default_pricing_mode' | 'default_price_per_skater_cents' | 'cancellation_hours' | 'rounding_step_cents'>
  session?: Session
  latestStart?: string | null
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const create = useCreateSessions(group.id)
  const update = useUpdateSession(session?.id ?? '')
  const currency = group.currency

  const defaults = (now?: Date): FormValues =>
    session
      ? {
          startsAt: toDateTimeLocalValue(session.starts_at),
          durationMinutes: String(Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000)),
          venue: session.venue,
          skaterCapacity: String(session.skater_capacity),
          goalieSlots: String(session.goalie_slots),
          iceCost: centsToInput(session.ice_cost_cents),
          goalieFee: centsToInput(session.goalie_fee_cents),
          pricingMode: session.pricing_mode,
          pricePerSkater: session.price_per_skater_cents ? centsToInput(session.price_per_skater_cents) : '',
          cancellationHours: String(session.cancellation_hours),
          notes: session.notes ?? '',
          repeat: false,
          repeatWeeks: '1',
        }
      : {
          startsAt: suggestedStart(latestStart ?? null, now),
          durationMinutes: String(group.default_duration_minutes),
          venue: group.default_venue,
          skaterCapacity: String(group.default_skater_capacity),
          goalieSlots: String(group.default_goalie_slots),
          iceCost: centsToInput(group.default_ice_cost_cents),
          goalieFee: centsToInput(group.default_goalie_fee_cents),
          pricingMode: group.default_pricing_mode,
          pricePerSkater: group.default_price_per_skater_cents ? centsToInput(group.default_price_per_skater_cents) : '',
          cancellationHours: String(group.cancellation_hours),
          notes: '',
          repeat: false,
          repeatWeeks: '4',
        }

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() })
  const errors = form.formState.errors
  const pricingMode = useWatch({ control: form.control, name: 'pricingMode' })
  const repeat = useWatch({ control: form.control, name: 'repeat' })

  const submit = form.handleSubmit((v) => {
    const input: SessionInput = {
      startsAt: fromDateTimeLocalValue(v.startsAt),
      durationMinutes: Number(v.durationMinutes),
      venue: v.venue,
      skaterCapacity: Number(v.skaterCapacity),
      goalieSlots: Number(v.goalieSlots),
      iceCostCents: parseMoneyInput(v.iceCost) ?? 0,
      goalieFeeCents: parseMoneyInput(v.goalieFee) ?? 0,
      pricingMode: v.pricingMode,
      pricePerSkaterCents: v.pricingMode === 'fixed' ? parseMoneyInput(v.pricePerSkater) : null,
      roundingStepCents: session?.rounding_step_cents ?? group.rounding_step_cents,
      cancellationHours: Number(v.cancellationHours),
      notes: v.notes || null,
    }
    if (session) {
      update.mutate(input, {
        onSuccess: () => {
          toast.success(copy.sessions.saved)
          setOpen(false)
        },
      })
    } else {
      const weeks = v.repeat ? Number(v.repeatWeeks) : 1
      create.mutate(
        { ...input, repeatWeeks: weeks },
        {
          onSuccess: (created) => {
            toast.success(copy.sessions.created(created.length))
            setOpen(false)
          },
        },
      )
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset(defaults(new Date()))
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{session ? copy.sessions.editTitle : copy.sessions.createTitle}</DialogTitle>
          <DialogDescription className="sr-only">{session ? copy.sessions.editTitle : copy.sessions.createTitle}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <FormField id="startsAt" label={copy.sessions.startsAt} error={errors.startsAt?.message}>
              {(c) => <Input {...c} {...form.register('startsAt')} type="datetime-local" />}
            </FormField>
            <FormField id="durationMinutes" label="Minúty" error={errors.durationMinutes?.message}>
              {(c) => <Input {...c} {...form.register('durationMinutes')} inputMode="numeric" />}
            </FormField>
          </div>
          <FormField id="venue" label={copy.sessions.venue} error={errors.venue?.message}>
            {(c) => <Input {...c} {...form.register('venue')} />}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="skaterCapacity" label={copy.sessions.skaterCapacity} error={errors.skaterCapacity?.message}>
              {(c) => <Input {...c} {...form.register('skaterCapacity')} inputMode="numeric" />}
            </FormField>
            <FormField id="goalieSlots" label={copy.sessions.goalieSlots} error={errors.goalieSlots?.message}>
              {(c) => <Input {...c} {...form.register('goalieSlots')} inputMode="numeric" />}
            </FormField>
            <FormField id="iceCost" label={copy.sessions.iceCost} error={errors.iceCost?.message}>
              {(c) => <MoneyInput {...c} {...form.register('iceCost')} currency={currency} />}
            </FormField>
            <FormField id="goalieFee" label={copy.sessions.goalieFee} error={errors.goalieFee?.message}>
              {(c) => <MoneyInput {...c} {...form.register('goalieFee')} currency={currency} />}
            </FormField>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold">{copy.sessions.pricingMode}</legend>
            <ToggleGroup type="single" value={pricingMode} onValueChange={(value) => value && form.setValue('pricingMode', value as FormValues['pricingMode'])}>
              <ToggleGroupItem value="dynamic">{copy.sessions.pricingDynamic}</ToggleGroupItem>
              <ToggleGroupItem value="fixed">{copy.sessions.pricingFixed}</ToggleGroupItem>
            </ToggleGroup>
          </fieldset>
          {pricingMode === 'fixed' && (
            <FormField id="pricePerSkater" label={copy.sessions.pricePerSkater} error={errors.pricePerSkater?.message}>
              {(c) => <MoneyInput {...c} {...form.register('pricePerSkater')} currency={currency} />}
            </FormField>
          )}
          <FormField id="cancellationHours" label={copy.sessions.cancellationHours} error={errors.cancellationHours?.message}>
            {(c) => <Input {...c} {...form.register('cancellationHours')} inputMode="numeric" />}
          </FormField>
          <FormField id="notes" label={copy.sessions.notes} optional error={errors.notes?.message}>
            {(c) => <Textarea {...c} {...form.register('notes')} rows={2} className="min-h-16" />}
          </FormField>
          {!session && (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <label className="flex min-h-11 items-center justify-between gap-3 text-base font-semibold">
                {copy.sessions.repeat}
                <Switch checked={repeat} onCheckedChange={(checked) => form.setValue('repeat', checked)} />
              </label>
              {repeat && (
                <FormField id="repeatWeeks" label={copy.sessions.repeatWeeks} error={errors.repeatWeeks?.message}>
                  {(c) => <Input {...c} {...form.register('repeatWeeks')} inputMode="numeric" className="w-28" />}
                </FormField>
              )}
            </div>
          )}
          <Button type="submit" size="lg" disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? copy.common.saving : session ? copy.common.save : copy.sessions.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
