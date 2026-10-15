import { defineConfig, devices } from '@playwright/test'

// Cloud-sync tests against the Firebase Auth + Firestore emulators: npm run e2e:cloud
const env = [
  'VITE_FIREBASE_API_KEY=demo-key',
  'VITE_FIREBASE_AUTH_DOMAIN=localhost',
  'VITE_FIREBASE_PROJECT_ID=demo-huayu',
  'VITE_FIREBASE_APP_ID=demo-app',
  'VITE_FIREBASE_EMULATORS=true',
].join(' ')

export default defineConfig({
  testDir: 'e2e-cloud',
  timeout: 90_000,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4174',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    serviceWorkers: 'block',
  },
  webServer: {
    command: `${env} npx vite build --outDir dist-emu && npx vite preview --outDir dist-emu --port 4174 --strictPort`,
    port: 4174,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
