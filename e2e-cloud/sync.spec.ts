import { expect, test, type Page } from '@playwright/test'
import { playLesson } from '../e2e/helpers'

/**
 * Sign in through the Auth emulator. (The real Google popup needs apis.google.com, so the test
 * uses the emulator's credential sign-in — everything after authentication is the real flow.)
 */
async function emulatorGoogleSignIn(page: Page, opts: { existing?: string; name?: string; email?: string }) {
  const email = opts.existing ?? opts.email!
  await page.waitForFunction(() => '__signIn' in window)
  await page.evaluate(([e, n]) => (window as unknown as { __signIn: (a: string, b: string) => Promise<void> }).__signIn(e, n), [
    email,
    opts.name ?? 'Learner',
  ])
}

test('guest progress syncs to a Google account and to a second device', async ({ browser }) => {
  const email = `learner${Date.now()}@example.com`

  // Device 1: learn as a guest, then sign in
  const ctx1 = await browser.newContext()
  const page = await ctx1.newPage()
  await page.goto('/')
  await page.getByTestId('get-started').click()
  await page.getByTestId('goal-continue').click()
  await page.getByRole('button', { name: 'Maybe later' }).click()
  await expect(page).toHaveURL(/\/lesson\/u01-l1/)
  await playLesson(page)
  await page.getByTestId('done').click()
  const xp = await page.getByTestId('xp').innerText()
  expect(xp).not.toBe('⚡ 0')

  await page.goto('/profile')
  await emulatorGoogleSignIn(page, { email, name: 'Ah Boy' })
  await expect(page.getByText('Progress synced')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ah Boy' })).toBeVisible()
  await expect(page.getByTestId('xp')).toHaveText(xp)

  // survives a reload (loaded from Firestore, not the guest store)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ah Boy' })).toBeVisible()
  await expect(page.getByTestId('xp')).toHaveText(xp)

  await page.goto('/friends')
  await expect(page.getByTestId('friend-code')).toHaveText(/^[A-Z2-9]{6}$/)
  const myCode = await page.getByTestId('friend-code').innerText()

  // Device 2: same account sees the same progress, no onboarding
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await page2.goto('/')
  await page2.getByTestId('get-started').click()
  await page2.getByTestId('goal-continue').click()
  await emulatorGoogleSignIn(page2, { existing: email, name: 'Ah Boy' })
  await expect(page2.getByTestId('xp')).toHaveText(xp, { timeout: 15_000 })
  await page2.goto('/')
  await expect(page2.getByTestId('lesson-u01-l1')).toHaveAttribute('data-status', 'done')

  // A friend adds you by code and both see each other on the leaderboard
  const ctx3 = await browser.newContext()
  const friend = await ctx3.newPage()
  await friend.goto(`/friends?add=${myCode}`)
  await emulatorGoogleSignIn(friend, { email: `friend${Date.now()}@example.com`, name: 'Kopi Kaki' })
  await expect(friend.getByText('Added Ah Boy')).toBeVisible({ timeout: 15_000 })
  await expect(friend.getByText('Ah Boy', { exact: true })).toBeVisible()

  await page.goto('/friends')
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByText('Kopi Kaki', { exact: true })).toBeVisible({ timeout: 15_000 })

  // Sign out: back to a guest, preferences kept, no onboarding
  await page.goto('/settings')
  await page.getByRole('button', { name: /Sign out/ }).click()
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Guest learner' })).toBeVisible()
  await expect(page.getByTestId('xp')).toHaveText('⚡ 0')

  await Promise.all([ctx1.close(), ctx2.close(), ctx3.close()])
})
