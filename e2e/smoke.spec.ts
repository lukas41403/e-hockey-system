import { expect, test } from './fixtures'

test('the app shell loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Partička')
})
