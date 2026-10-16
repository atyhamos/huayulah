import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173',
    // In sandboxes with a preinstalled Chromium, point at it: PW_CHROMIUM_PATH=/path/to/chrome
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    serviceWorkers: 'block',
  },
  webServer: {
    // mode e2e: guest-only build (doesn't load .env.production, so tests never touch the real project)
    command: 'npm run gen && npx vite build --mode e2e && npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
