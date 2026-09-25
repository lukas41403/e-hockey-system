import { Link, NavLink, Outlet, useParams } from 'react-router'
import { ChevronDown, Home, Plus, Store, UserRound, Wallet } from 'lucide-react'
import { cn } from 'cn'
import { RinkMark } from '@/components/rink/RinkMark'
import { OfflineBanner } from '@/components/OfflineBanner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMyGroups } from '@/features/groups/api'
import { APP_NAME } from '@/lib/app'
import { copy } from '@/lib/copy'

const NAV_ITEMS = [
  { to: '/', label: copy.nav.home, icon: Home, end: true },
  { to: '/burza', label: copy.nav.marketplace, icon: Store, end: false },
  { to: '/financie', label: copy.nav.finance, icon: Wallet, end: false },
  { to: '/profil', label: copy.nav.profile, icon: UserRound, end: false },
] as const

export function AppShell() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#obsah"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Preskočiť na obsah
      </a>
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <TopBar />
        <OfflineBanner />
        <main id="obsah" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 outline-none lg:px-8 lg:pt-8 lg:pb-16">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <Link to="/" className="inline-flex size-11 items-center justify-center rounded-md lg:hidden" aria-label={`${APP_NAME}, ${copy.nav.home}`}>
        <RinkMark className="size-8" />
      </Link>
      <GroupSwitcher />
    </header>
  )
}

function GroupSwitcher() {
  const { groupId } = useParams()
  const groups = useMyGroups()
  const current = groups.data?.find((g) => g.group.id === groupId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-11 min-w-0 items-center gap-1.5 rounded-md px-2 text-base font-semibold hover:bg-surface-2">
        <span className="truncate">{current ? current.group.name : copy.nav.groups}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">, {copy.nav.switchGroup}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{copy.nav.groups}</DropdownMenuLabel>
        {groups.data?.map(({ group, role }) => (
          <DropdownMenuItem key={group.id} asChild>
            <Link to={`/partie/${group.id}`} className="justify-between">
              <span className="truncate">{group.name}</span>
              <span className="text-xs text-muted-foreground">{copy.groups.members[role]}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        {groups.data && groups.data.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <Link to="/partie/nova">
            <Plus aria-hidden="true" />
            {copy.nav.createGroup}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BottomNav() {
  return (
    <nav
      aria-label={copy.nav.mainNavigation}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground',
                  isActive && 'text-primary before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:bg-primary',
                )
              }
            >
              <Icon className="size-6" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Sidebar() {
  const groups = useMyGroups()
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border px-3 py-5 lg:flex">
      <Link to="/" className="flex items-center gap-2.5 px-2">
        <RinkMark className="size-8" />
        <span className="font-display text-xl">{APP_NAME}</span>
      </Link>
      <nav aria-label={copy.nav.mainNavigation}>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-md px-3 text-base font-semibold text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                    isActive && 'bg-surface-2 text-foreground',
                  )
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-h-0 flex-col gap-1">
        <h2 className="px-3 text-xs font-semibold text-muted-foreground">{copy.nav.groups}</h2>
        <ul className="flex flex-col gap-0.5 overflow-y-auto">
          {groups.data?.map(({ group }) => (
            <li key={group.id}>
              <NavLink
                to={`/partie/${group.id}`}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                    isActive && 'bg-surface-2 text-foreground',
                  )
                }
              >
                <span className="truncate">{group.name}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <Link
              to="/partie/nova"
              className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary hover:bg-surface-2"
            >
              <Plus className="size-4" aria-hidden="true" />
              {copy.nav.createGroup}
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  )
}
