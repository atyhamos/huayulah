import { expect, test } from '@playwright/test'
import { onboard, playLesson } from './helpers'

test('guest can finish a lesson and progress persists', async ({ page }) => {
  await onboard(page)
  await playLesson(page, { wrongFirst: true })
  await expect(page.getByTestId('lesson-complete')).toContainText('Lesson complete')
  await page.getByTestId('done').click()

  await expect(page.getByTestId('xp')).not.toHaveText('⚡ 0')
  await expect(page.getByTestId('streak')).toHaveText('🔥 1')
  await expect(page.getByTestId('lesson-u01-l1')).toHaveAttribute('data-status', 'done')
  await expect(page.getByTestId('lesson-u01-l2')).toHaveAttribute('data-status', 'open')
  await expect(page.getByTestId('lesson-u01-l3')).toHaveAttribute('data-status', 'locked')

  await page.reload()
  await expect(page.getByTestId('lesson-u01-l1')).toHaveAttribute('data-status', 'done')

  await page.goto('/words')
  await expect(page.getByTestId('word-row')).toHaveCount(6)
  await page.getByTestId('word-search').fill('ni')
  await expect(page.getByTestId('word-row').first()).toContainText('you')
})

test('practice mode replays a finished lesson without intros', async ({ page }) => {
  await onboard(page)
  await playLesson(page)
  await page.getByTestId('done').click()
  await page.getByTestId('lesson-u01-l1').click()
  await page.getByTestId('start-lesson').click()
  await expect(page).toHaveURL(/mode=practice/)
  await expect(page.getByText('New word')).toHaveCount(0)
  await playLesson(page)
  await expect(page.getByTestId('lesson-complete')).toContainText('Practice complete')
})

test('flashcards come due and can be reviewed', async ({ page }) => {
  const start = new Date('2026-05-04T09:00:00')
  await page.clock.setFixedTime(start)
  await onboard(page)
  await playLesson(page)
  await page.getByTestId('done').click()

  // four days later
  await page.clock.setFixedTime(new Date(start.getTime() + 4 * 864e5))
  await page.reload()
  await expect(page.getByTestId('due-badge')).toBeVisible()
  await page.getByTestId('review-cta').click()
  await page.getByTestId('start-review').click()
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId('review-done').isVisible()) break
    await page.getByTestId('flashcard').click()
    const good = page.getByTestId('rate-good')
    if (await good.isVisible()) await good.click()
    else await page.getByRole('button', { name: 'Continue' }).click()
  }
  await expect(page.getByTestId('review-done')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('All caught up!')).toBeVisible()

  await page.getByTestId('practice-weak').click()
  await playLesson(page)
  await expect(page.getByTestId('lesson-complete')).toContainText('Practice complete')
  await page.getByTestId('done').click()
  // streak: day 1 + day 5 with no freezes → resets to 1
  await expect(page.getByTestId('streak')).toHaveText('🔥 1')
})
