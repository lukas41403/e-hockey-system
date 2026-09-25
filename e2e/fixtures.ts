import { test as base, expect } from '@playwright/test'

// Every e2e test fails when the browser console reports an error or an uncaught exception.
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
      })
      await use(errors)
      expect(errors, 'browser console errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
