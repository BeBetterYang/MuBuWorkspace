import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5185',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:5185',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /ipad-layout\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ipad-portrait',
      testMatch: /ipad-layout\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 834, height: 1194 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'ipad-landscape',
      testMatch: /ipad-layout\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1194, height: 834 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
})
