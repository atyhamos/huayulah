import { expect, test } from '@playwright/test'
import { playLesson } from './helpers'

test('express train from onboarding clears the first line', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('get-started').click()
  await page.getByTestId('onboard-express').click()
  await expect(page).toHaveURL(/\/lesson\/express-u01/)
  await playLesson(page)
  await expect(page.getByTestId('lesson-complete')).toContainText('Express train: line cleared!')
  await page.getByTestId('done').click()
  for (const n of [1, 3, 6]) await expect(page.getByTestId(`lesson-u01-l${n}`)).toHaveAttribute('data-status', 'done')
  await expect(page.getByTestId('lesson-u01-l1')).toContainText('Cleared by express train')
  // the next line still offers its own express test
  await expect(page.getByTestId('express-u02')).toBeVisible()
  await expect(page.getByTestId('express-u01')).toHaveCount(0)
})

test('reminder card offers a calendar file and a Google Calendar link', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('get-started').click()
  await page.getByTestId('goal-continue').click()
  await page.goto('/settings')
  await page.getByTestId('reminder-time').fill('07:30')
  await expect(page.getByTestId('reminder-google')).toHaveAttribute('href', /T073000%2F.*RRULE%3AFREQ%3DDAILY/)
  const download = page.waitForEvent('download')
  await page.getByTestId('reminder-ics').click()
  expect((await download).suggestedFilename()).toBe('huayu-lah-reminder.ics')
})
