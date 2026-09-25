// Development only: sign in as a seed user with one tap. Not included in production builds.
import { useState } from 'react'
import { toast } from 'sonner'
import { copy } from '@/lib/copy'
import { getErrorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

const SEED_USERS = [
  { email: 'martin.kovac@particka.test', label: 'Martin Kováč', role: 'admin Nitra' },
  { email: 'lukas.molnar@particka.test', label: 'Lukáš Molnár', role: 'postúpil z čakacej listiny' },
  { email: 'lubomir.svec@particka.test', label: 'Ľubomír Švec', role: 'hráč s dlhom' },
  { email: 'richard.hudak@particka.test', label: 'Richard Hudák', role: 'brankár s nevyplatenou odmenou' },
  { email: 'michal.varga@particka.test', label: 'Michal Varga', role: 'Nitra aj Trnava' },
  { email: 'vladimir.oravec@particka.test', label: 'Vladimír Oravec', role: 'admin Trnava' },
  { email: 'boris.hlinka@particka.test', label: 'Boris Hlinka', role: 'hosť čaká na schválenie' },
  { email: 'petr.novak@particka.test', label: 'Petr Novák', role: 'admin Brno' },
  { email: 'superadmin@particka.test', label: 'Správca', role: 'superadmin' },
] as const

export default function DevQuickLogin() {
  const [busy, setBusy] = useState<string | null>(null)

  async function signIn(email: string) {
    setBusy(email)
    const { error } = await supabase.auth.signInWithPassword({ email, password: 'hokej123' })
    setBusy(null)
    if (error) toast.error(getErrorMessage(error))
  }

  return (
    <section aria-labelledby="quick-login" className="rounded-lg border border-dashed border-input p-4">
      <h2 id="quick-login" className="font-display text-xl">
        {copy.auth.quickLoginTitle}
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">{copy.auth.quickLoginHint}</p>
      <ul className="flex flex-col">
        {SEED_USERS.map((user) => (
          <li key={user.email}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => signIn(user.email)}
              className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-border py-2 text-left hover:text-primary disabled:opacity-50"
            >
              <span className="font-semibold">{user.label}</span>
              <span className="text-sm text-muted-foreground">{user.role}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
