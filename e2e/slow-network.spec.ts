import { expect, test } from '@playwright/test'

/** Chrome DevTools' "Slow 4G" preset: 562.5 ms RTT, ~1.4 Mbps down, ~675 kbps up. */
const SLOW_4G = {
  offline: false,
  latency: 562.5,
  downloadThroughput: ((1.6 * 1024 * 1024) / 8) * 0.9,
  uploadThroughput: ((750 * 1024) / 8) * 0.9,
}

test('the landing page and login stay usable on a slow mobile network', async ({ page }) => {
  // The dev server ships unbundled modules, so a cold load here is slower than production.
  test.setTimeout(120_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', SLOW_4G)

  const started = Date.now()
  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan. Track. Ship.', {
    timeout: 60_000,
  })
  test.info().annotations.push({
    type: 'landing heading visible (ms)',
    description: String(Date.now() - started),
  })

  // Client-side navigation lazy-loads the login route over the same slow link.
  await page.getByRole('link', { name: 'Log in' }).first().click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({
    timeout: 30_000,
  })

  // The form validates without a round trip, so it responds immediately.
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByText('Password is required')).toBeVisible()
})
