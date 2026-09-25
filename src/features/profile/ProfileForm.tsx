import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { MyProfile, ProfileInput } from '@/features/profile/api'
import { copy } from '@/lib/copy'
import { formatIban, isValidIban, normalizeIban } from '@/lib/iban'
import { formatPhone, normalizePhone } from '@/lib/phone'

const schema = z.object({
  fullName: z
    .string()
    .trim()
    .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2 && value.length <= 80, copy.profile.fullNameInvalid),
  nickname: z.string().trim().max(30),
  jerseyNumber: z.string().trim().refine((value) => value === '' || /^\d{1,2}$/.test(value), copy.profile.jerseyInvalid),
  phone: z.string().trim().refine((value) => value === '' || normalizePhone(value) !== null, copy.profile.phoneInvalid),
  preferredRole: z.enum(['skater', 'goalie']),
  iban: z.string().trim().refine((value) => value === '' || isValidIban(value), copy.profile.ibanInvalid),
})

type FormValues = z.infer<typeof schema>

export function ProfileForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
}: {
  initial: MyProfile | undefined
  submitLabel: string
  busy: boolean
  onSubmit: (input: ProfileInput) => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initial?.profile.full_name ?? '',
      nickname: initial?.profile.nickname ?? '',
      jerseyNumber: initial?.profile.jersey_number?.toString() ?? '',
      phone: initial?.private?.phone_e164 ? formatPhone(initial.private.phone_e164) : '',
      preferredRole: initial?.profile.preferred_role ?? 'skater',
      iban: initial?.private?.iban ? formatIban(initial.private.iban) : '',
    },
  })
  const errors = form.formState.errors
  const preferredRole = useWatch({ control: form.control, name: 'preferredRole' })

  const submit = form.handleSubmit((values) =>
    onSubmit({
      fullName: values.fullName.replace(/\s+/g, ' '),
      nickname: values.nickname || null,
      jerseyNumber: values.jerseyNumber === '' ? null : Number(values.jerseyNumber),
      preferredRole: values.preferredRole,
      phoneE164: values.phone === '' ? null : normalizePhone(values.phone),
      iban: values.iban === '' ? null : normalizeIban(values.iban),
    }),
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormField id="fullName" label={copy.profile.fullName} error={errors.fullName?.message}>
        {(control) => <Input {...control} {...form.register('fullName')} autoComplete="name" />}
      </FormField>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <FormField id="nickname" label={copy.profile.nickname} optional error={errors.nickname?.message}>
          {(control) => <Input {...control} {...form.register('nickname')} autoComplete="nickname" />}
        </FormField>
        <FormField id="jerseyNumber" label={copy.profile.jerseyNumber} optional error={errors.jerseyNumber?.message}>
          {(control) => (
            <Input {...control} {...form.register('jerseyNumber')} inputMode="numeric" maxLength={2} className="font-display text-xl" />
          )}
        </FormField>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">{copy.profile.preferredRole}</legend>
        <ToggleGroup
          type="single"
          value={preferredRole}
          onValueChange={(value) => value && form.setValue('preferredRole', value as FormValues['preferredRole'])}
          aria-label={copy.profile.preferredRole}
        >
          <ToggleGroupItem value="skater">{copy.profile.skater}</ToggleGroupItem>
          <ToggleGroupItem value="goalie">{copy.profile.goalie}</ToggleGroupItem>
        </ToggleGroup>
      </fieldset>
      <FormField id="phone" label={copy.profile.phone} optional hint={copy.profile.phoneHint} error={errors.phone?.message}>
        {(control) => <Input {...control} {...form.register('phone')} type="tel" inputMode="tel" autoComplete="tel" />}
      </FormField>
      <FormField id="iban" label={copy.profile.iban} optional hint={copy.profile.ibanHint} error={errors.iban?.message}>
        {(control) => (
          <Input {...control} {...form.register('iban')} autoCapitalize="characters" autoComplete="off" spellCheck={false} />
        )}
      </FormField>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? copy.common.saving : submitLabel}
      </Button>
    </form>
  )
}
