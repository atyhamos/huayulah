import { expect, test } from '@playwright/test'
import { onboard, playLesson } from './helpers'

test('grammar track: read the rules, play a topic, the next one opens', async ({ page }) => {
  await onboard(page)
  await page.goto('/')
  await page.getByTestId('track-grammar').click()
  await expect(page).toHaveURL(/\/grammar$/)
  await expect(page.getByTestId('topic-g01')).toHaveAttribute('data-status', 'open')
  await expect(page.getByTestId('topic-g02')).toHaveAttribute('data-status', 'locked')

  // a locked topic's rules can still be read
  await page.getByTestId('topic-g02').click()
  await expect(page.getByTestId('topic-locked')).toBeVisible()
  await expect(page.getByTestId('rule-card').first()).toBeVisible()

  await page.goto('/grammar/g01')
  await page.getByTestId('start-grammar').click()
  await expect(page).toHaveURL(/\/grammar\/g01\/play$/)
  await expect(page.getByTestId('rule-card')).toContainText('Rule 1 of 3')
  await playLesson(page, { wrongFirst: true })
  await expect(page.getByTestId('lesson-complete')).toContainText('Topic done!')
  await page.getByTestId('done').click()
  await expect(page).toHaveURL(/\/grammar\/g01$/)
  await expect(page.getByTestId('start-grammar')).toContainText('Practise again')
  await page.goto('/grammar')
  await expect(page.getByTestId('topic-g01')).toHaveAttribute('data-status', 'done')
  await expect(page.getByTestId('topic-g02')).toHaveAttribute('data-status', 'open')
})

test('a wrong answer explains why', async ({ page }) => {
  await onboard(page)
  await page.goto('/grammar/g06/play')
  // read through the three rule cards
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByTestId('rule-card')).toContainText(`Rule ${i} of 3`)
    await page.getByTestId('check').click()
  }
  await expect(page.getByTestId('rule-card')).toHaveCount(0)
  const wrong = page.locator('[data-testid=option]:not([data-correct])').first()
  if ((await page.getByTestId('tile').count()) > 0) {
    // put an order drill together backwards
    const n = await page.getByTestId('tile').count()
    for (let i = n - 1; i >= 0; i--) await page.locator(`[data-testid=tile][data-pos="${i}"]`).click()
  } else await wrong.click()
  await page.getByTestId('check').click()
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'false')
  await expect(page.getByTestId('why')).not.toBeEmpty()
})

test('testing out of a section clears its topics', async ({ page }) => {
  await onboard(page)
  await page.goto('/grammar')
  await page.getByTestId('gtest-1').click()
  await playLesson(page)
  await expect(page.getByTestId('lesson-complete')).toContainText('Section cleared!')
  await page.getByTestId('done').click()
  for (const id of ['g01', 'g02', 'g03', 'g04', 'g05']) await expect(page.getByTestId(`topic-${id}`)).toHaveAttribute('data-status', 'done')
  await expect(page.getByTestId('topic-g06')).toHaveAttribute('data-status', 'open')
  await expect(page.getByTestId('gtest-1')).toHaveCount(0)
})

test('a line links to the grammar it leans on', async ({ page }) => {
  await onboard(page)
  await page.goto('/')
  await page.getByTestId('unit-u10').getByTestId('line-grammar-g06').click()
  await expect(page).toHaveURL(/\/grammar\/g06$/)
  await expect(page.getByTestId('grammar-topic')).toContainText("Not and didn't")
})
