import { expect, type Page } from '@playwright/test'

/** Answer every exercise correctly until the lesson-complete screen appears. */
export async function playLesson(page: Page, opts: { wrongFirst?: boolean } = {}) {
  let madeMistake = !opts.wrongFirst
  for (let step = 0; step < 80; step++) {
    if (await page.getByTestId('lesson-complete').isVisible()) return
    if (await page.getByTestId('feedback').isVisible()) {
      await page.getByTestId('continue').click()
      continue
    }
    const check = page.getByTestId('check')
    if ((await check.isVisible()) && (await check.innerText()).toLowerCase().includes('continue')) {
      await check.click()
      continue
    }
    if (await page.getByTestId('option').first().isVisible()) {
      const target = madeMistake ? '[data-testid=option][data-correct=true]' : '[data-testid=option]:not([data-correct])'
      madeMistake = true
      await page.locator(target).first().click()
      await check.click()
      continue
    }
    if (await page.getByTestId('match-zh').first().isVisible()) {
      const ids = await page.locator('[data-testid=match-zh]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id!))
      for (const id of ids) {
        await page.locator(`[data-testid=match-zh][data-id="${id}"]`).click()
        await page.locator(`[data-testid=match-en][data-id="${id}"]`).click()
      }
      await expect(page.getByTestId('feedback')).toBeVisible()
      continue
    }
    if (await page.getByTestId('tile').first().isVisible()) {
      const n = await page.locator('[data-testid=tile]:not([data-pos="-1"])').count()
      for (let i = 0; i < n; i++) await page.locator(`[data-testid=tile][data-pos="${i}"]`).click()
      await check.click()
      continue
    }
    const skip = page.getByText("Can't speak now")
    if (await skip.isVisible()) {
      await skip.click()
      continue
    }
    await page.waitForTimeout(150)
  }
  throw new Error('Lesson did not finish')
}

export async function onboard(page: Page) {
  await page.goto('/')
  await page.getByTestId('get-started').click()
  await page.getByTestId('goal-continue').click()
  await expect(page).toHaveURL(/\/lesson\/u01-l1/)
}
