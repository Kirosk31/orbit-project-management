import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('sends visitors to their language', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'pt-BR' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/\/pt-BR$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await context.close()
})

test('serves Costa Rica a complete, accessible page in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/es-CR')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Planifica.')
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1)
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()

  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await page.reload()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
      `${scheme} theme`,
    ).toEqual([])
  }
})

test('the live board lands its card and can replay', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByRole('img', { name: /6 of 14/ })).toBeVisible()
  await page.getByRole('button', { name: 'Replay the board' }).click()
  await expect(page.getByRole('img', { name: /5 of 14/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /6 of 14/ })).toBeVisible()
})

test('language menu links every locale', async ({ page }) => {
  await page.goto('/en')
  await page.locator('summary', { hasText: /^Language:/ }).click()
  await page.getByRole('link', { name: 'Español (Costa Rica)' }).click()
  await expect(page).toHaveURL(/\/es-CR$/)
})
