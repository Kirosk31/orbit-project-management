import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('public experience', () => {
  test('is keyboard navigable and has no serious automated accessibility violations', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan. Track. Ship.')
    await page.waitForTimeout(1_200)

    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([])
  })

  test('supports a complete language switch without reloading', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Language', exact: true }).first().click()
    await page.getByRole('menuitem', { name: /Español/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Planifica. Haz seguimiento. Entrega.',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  })
})
