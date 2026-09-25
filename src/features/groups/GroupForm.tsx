import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { SectionTitle } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { GroupSettingsInput } from '@/features/groups/api'
import { copy } from '@/lib/copy'
import { normalizeIban, formatIban, isValidIban } from '@/lib/iban'
import { centsToInput, formatMoney, parseMoneyInput } from '@/lib/money'
import type { Group } from '@/lib/supabase'
import { isWhatsappInviteUrl } from '@/lib/whatsapp'

const money = (message: string) => z.string().trim().refine((v) => parseMoneyInput(v) !== null, message)
const intRange = (min: number, max: number, message: string) =>
  z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, message)

const schema = z
  .object({
    name: z.string().trim().min(2, 'Názov musí mať aspoň 2 znaky.').max(80),
    city: z.string().trim().min(1, 'Vyplň mesto.').max(60),
    country: z.enum(['SK', 'CZ']),
    iban: z.string().trim().refine(isValidIban, copy.profile.ibanInvalid),
    accountHolderName: z.string().trim().min(2, 'Vyplň meno majiteľa účtu.').max(70),
    whatsappInviteUrl: z.string().trim().refine((v) => v === '' || isWhatsappInviteUrl(v), copy.groups.whatsappInvalid),
    defaultVenue: z.string().trim().max(120),
    defaultDurationMinutes: intRange(15, 300, 'Dĺžka musí byť od 15 do 300 minút.'),
    defaultSkaterCapacity: intRange(1, 100, 'Zadaj 1 až 100 hráčov.'),
    defaultGoalieSlots: intRange(0, 4, 'Zadaj 0 až 4 brankárov.'),
    defaultIceCost: money('Zadaj cenu ľadu, napríklad 180 alebo 180,50.'),
    defaultGoalieFee: money('Zadaj odmenu, napríklad 15.'),
    defaultPricingMode: z.enum(['dynamic', 'fixed']),
    defaultPricePerSkater: z.string().trim(),
    cancellationHours: intRange(0, 168, 'Zadaj 0 až 168 hodín.'),
    roundingStepCents: z.string(),
  })
  .refine((v) => v.defaultPricingMode === 'dynamic' || (parseMoneyInput(v.defaultPricePerSkater) ?? 0) > 0, {
    path: ['defaultPricePerSkater'],
    message: 'Pri fixnej cene zadaj cenu pre hráča.',
  })

type FormValues = z.infer<typeof schema>

const ROUNDING_STEPS = { EUR: [10, 50, 100], CZK: [100, 500, 1000] } as const

export function GroupForm({
  group,
  submitLabel,
  busy,
  onSubmit,
}: {
  group?: Group
  submitLabel: string
  busy: boolean
  onSubmit: (input: GroupSettingsInput & { roundingStepCents: number }) => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: group
      ? {
          name: group.name,
          city: group.city,
          country: group.country,
          iban: formatIban(group.iban),
          accountHolderName: group.account_holder_name,
          whatsappInviteUrl: group.whatsapp_invite_url ?? '',
          defaultVenue: group.default_venue,
          defaultDurationMinutes: String(group.default_duration_minutes),
          defaultSkaterCapacity: String(group.default_skater_capacity),
          defaultGoalieSlots: String(group.default_goalie_slots),
          defaultIceCost: centsToInput(group.default_ice_cost_cents),
          defaultGoalieFee: centsToInput(group.default_goalie_fee_cents),
          defaultPricingMode: group.default_pricing_mode,
          defaultPricePerSkater: group.default_price_per_skater_cents ? centsToInput(group.default_price_per_skater_cents) : '',
          cancellationHours: String(group.cancellation_hours),
          roundingStepCents: String(group.rounding_step_cents),
        }
      : {
          name: '',
          city: '',
          country: 'SK',
          iban: '',
          accountHolderName: '',
          whatsappInviteUrl: '',
          defaultVenue: '',
          defaultDurationMinutes: '75',
          defaultSkaterCapacity: '20',
          defaultGoalieSlots: '2',
          defaultIceCost: '',
          defaultGoalieFee: '',
          defaultPricingMode: 'dynamic',
          defaultPricePerSkater: '',
          cancellationHours: '24',
          roundingStepCents: '50',
        },
  })
  const errors = form.formState.errors
  const country = useWatch({ control: form.control, name: 'country' })
  const currency = country === 'SK' ? 'EUR' : 'CZK'
  const pricingMode = useWatch({ control: form.control, name: 'defaultPricingMode' })

  const submit = form.handleSubmit((v) =>
    onSubmit({
      name: v.name,
      city: v.city,
      country: v.country,
      iban: normalizeIban(v.iban),
      accountHolderName: v.accountHolderName,
      whatsappInviteUrl: v.whatsappInviteUrl || null,
      defaultVenue: v.defaultVenue,
      defaultDurationMinutes: Number(v.defaultDurationMinutes),
      defaultSkaterCapacity: Number(v.defaultSkaterCapacity),
      defaultGoalieSlots: Number(v.defaultGoalieSlots),
      defaultIceCostCents: parseMoneyInput(v.defaultIceCost) ?? 0,
      defaultGoalieFeeCents: parseMoneyInput(v.defaultGoalieFee) ?? 0,
      defaultPricingMode: v.defaultPricingMode,
      defaultPricePerSkaterCents: v.defaultPricingMode === 'fixed' ? parseMoneyInput(v.defaultPricePerSkater) : null,
      cancellationHours: Number(v.cancellationHours),
      roundingStepCents: Number(v.roundingStepCents),
    }),
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormField id="name" label={copy.groups.name} error={errors.name?.message}>
        {(c) => <Input {...c} {...form.register('name')} placeholder={copy.groups.namePlaceholder} />}
      </FormField>
      <FormField id="city" label={copy.groups.city} error={errors.city?.message}>
        {(c) => <Input {...c} {...form.register('city')} autoComplete="address-level2" />}
      </FormField>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">{copy.groups.country}</legend>
        <ToggleGroup
          type="single"
          value={country}
          onValueChange={(value) => {
            if (!value) return
            form.setValue('country', value as FormValues['country'])
            if (!group) form.setValue('roundingStepCents', value === 'SK' ? '50' : '1000')
          }}
        >
          <ToggleGroupItem value="SK">{copy.groups.countrySk}</ToggleGroupItem>
          <ToggleGroupItem value="CZ">{copy.groups.countryCz}</ToggleGroupItem>
        </ToggleGroup>
      </fieldset>
      <FormField id="iban" label={copy.groups.iban} error={errors.iban?.message}>
        {(c) => <Input {...c} {...form.register('iban')} autoCapitalize="characters" spellCheck={false} autoComplete="off" />}
      </FormField>
      <FormField id="accountHolderName" label={copy.groups.accountHolder} hint={copy.groups.accountHolderHint} error={errors.accountHolderName?.message}>
        {(c) => <Input {...c} {...form.register('accountHolderName')} />}
      </FormField>
      <FormField id="whatsappInviteUrl" label={copy.groups.whatsapp} optional hint={copy.groups.whatsappHint} error={errors.whatsappInviteUrl?.message}>
        {(c) => <Input {...c} {...form.register('whatsappInviteUrl')} type="url" inputMode="url" placeholder="https://chat.whatsapp.com/..." />}
      </FormField>

      <div>
        <SectionTitle>{copy.groups.defaultsTitle}</SectionTitle>
        <p className="text-sm text-muted-foreground">{copy.groups.defaultsHint}</p>
      </div>
      <FormField id="defaultVenue" label={copy.sessions.venue} optional error={errors.defaultVenue?.message}>
        {(c) => <Input {...c} {...form.register('defaultVenue')} placeholder="Zimný štadión" />}
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField id="defaultSkaterCapacity" label={copy.sessions.skaterCapacity} error={errors.defaultSkaterCapacity?.message}>
          {(c) => <Input {...c} {...form.register('defaultSkaterCapacity')} inputMode="numeric" />}
        </FormField>
        <FormField id="defaultGoalieSlots" label={copy.sessions.goalieSlots} error={errors.defaultGoalieSlots?.message}>
          {(c) => <Input {...c} {...form.register('defaultGoalieSlots')} inputMode="numeric" />}
        </FormField>
        <FormField id="defaultDurationMinutes" label="Minúty" error={errors.defaultDurationMinutes?.message}>
          {(c) => <Input {...c} {...form.register('defaultDurationMinutes')} inputMode="numeric" />}
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField id="defaultIceCost" label={copy.sessions.iceCost} error={errors.defaultIceCost?.message}>
          {(c) => <MoneyInput {...c} {...form.register('defaultIceCost')} currency={currency} />}
        </FormField>
        <FormField id="defaultGoalieFee" label={copy.sessions.goalieFee} error={errors.defaultGoalieFee?.message}>
          {(c) => <MoneyInput {...c} {...form.register('defaultGoalieFee')} currency={currency} />}
        </FormField>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">{copy.sessions.pricingMode}</legend>
        <ToggleGroup
          type="single"
          value={pricingMode}
          onValueChange={(value) => value && form.setValue('defaultPricingMode', value as FormValues['defaultPricingMode'])}
        >
          <ToggleGroupItem value="dynamic">{copy.sessions.pricingDynamic}</ToggleGroupItem>
          <ToggleGroupItem value="fixed">{copy.sessions.pricingFixed}</ToggleGroupItem>
        </ToggleGroup>
        {pricingMode === 'dynamic' && <p className="measure text-sm text-muted-foreground">{copy.sessions.pricingDynamicHint}</p>}
      </fieldset>
      {pricingMode === 'fixed' && (
        <FormField id="defaultPricePerSkater" label={copy.sessions.pricePerSkater} error={errors.defaultPricePerSkater?.message}>
          {(c) => <MoneyInput {...c} {...form.register('defaultPricePerSkater')} currency={currency} />}
        </FormField>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="cancellationHours" label={copy.sessions.cancellationHours} error={errors.cancellationHours?.message}>
          {(c) => <Input {...c} {...form.register('cancellationHours')} inputMode="numeric" />}
        </FormField>
        {group && (
          <FormField id="roundingStepCents" label={copy.groups.roundingStep}>
            {(c) => (
              <NativeSelect {...c} {...form.register('roundingStepCents')}>
                {ROUNDING_STEPS[currency].map((step) => (
                  <option key={step} value={step}>
                    {formatMoney(step, currency)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        )}
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? copy.common.saving : submitLabel}
      </Button>
    </form>
  )
}
