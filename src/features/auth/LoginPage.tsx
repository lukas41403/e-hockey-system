import { lazy, Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { RinkMark } from '@/components/rink/RinkMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/authContext'
import { safeNextPath } from '@/features/auth/next'
import { APP_NAME } from '@/lib/app'
import { copy } from '@/lib/copy'
import { getErrorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

// The dev-only panel is dropped from production builds together with its seed accounts.
const DevQuickLogin = import.meta.env.DEV ? lazy(() => import('@/features/auth/DevQuickLogin')) : null

const emailSchema = z.object({ email: z.email(copy.auth.emailInvalid) })
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, copy.auth.codeInvalid) })

const RESEND_SECONDS = 30

export function LoginPage() {
  const { session } = useAuth()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const [email, setEmail] = useState<string | null>(null)

  if (session) return <Navigate to={next} replace />

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="flex items-center gap-3">
        <RinkMark className="size-10" />
        <span className="font-display text-title">{APP_NAME}</span>
      </div>
      {email ? <CodeStep email={email} onChangeEmail={() => setEmail(null)} /> : <EmailStep onSent={setEmail} />}
      {DevQuickLogin && (
        <Suspense fallback={null}>
          <DevQuickLogin />
        </Suspense>
      )}
    </main>
  )
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } })
  const [sending, setSending] = useState(false)

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setSending(false)
    if (error) {
      form.setError('email', { message: getErrorMessage(error) })
      return
    }
    onSent(email)
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="font-display text-display">{copy.auth.title}</h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.auth.intro}</p>
      </div>
      <FormField id="email" label={copy.auth.email} error={form.formState.errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder={copy.auth.emailPlaceholder}
          />
        )}
      </FormField>
      <Button type="submit" size="lg" disabled={sending}>
        {sending ? copy.auth.sendingCode : copy.auth.sendCode}
      </Button>
    </form>
  )
}

function CodeStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const onSubmit = form.handleSubmit(async ({ code }) => {
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setVerifying(false)
    if (error) form.setError('code', { message: getErrorMessage(error) })
  })

  async function resend() {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) {
      toast.error(getErrorMessage(error))
      return
    }
    setCooldown(RESEND_SECONDS)
    toast.success(copy.auth.resent)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="font-display text-display">{copy.auth.codeTitle}</h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.auth.codeSentTo(email)}</p>
      </div>
      <FormField id="code" label={copy.auth.code} error={form.formState.errors.code?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register('code', {
              onChange: (event) => {
                const digits = String(event.target.value).replace(/\D/g, '').slice(0, 6)
                form.setValue('code', digits)
                if (digits.length === 6) void onSubmit()
              },
            })}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            className="h-14 text-center font-display text-title tracking-[0.5em]"
          />
        )}
      </FormField>
      <Button type="submit" size="lg" disabled={verifying}>
        {verifying ? copy.auth.signingIn : copy.auth.signIn}
      </Button>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Button type="button" variant="link" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `${copy.auth.resend} (${cooldown} s)` : copy.auth.resend}
        </Button>
        <Button type="button" variant="link" onClick={onChangeEmail}>
          {copy.auth.changeEmail}
        </Button>
      </div>
    </form>
  )
}
