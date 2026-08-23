import { defineConfig, devices } from '@playwright/test'

const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: isCi ? [['html', { open: 'never' }], ['github']] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: /accessibility\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://127.0.0.1:4000/health/ready',
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
    {
      command: 'npm exec --workspace=@orbit/web -- vite --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
  ],
})
