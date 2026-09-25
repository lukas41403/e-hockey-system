import { useSyncExternalStore } from 'react'

// A shared clock that ticks every 30 s, so deadlines and "started" states stay current
// without calling Date.now() during render.
let current = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    timer = setInterval(() => {
      current = Date.now()
      for (const notify of listeners) notify()
    }, 30_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useNow(): Date {
  const value = useSyncExternalStore(subscribe, () => current, () => current)
  return new Date(value)
}
