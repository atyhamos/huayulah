import { expect, test } from '@playwright/test'
import { onboard } from './helpers'

/** Record what gets spoken (a stub Mandarin voice, as in learn.spec.ts). */
async function stubSpeech(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const zh = [{ name: 'Test Mandarin', lang: 'zh-CN', voiceURI: 'test-zh', default: false, localService: true }]
    Object.defineProperty(window.speechSynthesis, 'getVoices', { value: () => zh })
    const spoken: string[] = []
    Object.assign(window, { __spoken: spoken })
    Object.defineProperty(window.speechSynthesis, 'speak', { value: (u: SpeechSynthesisUtterance) => spoken.push(u.text) })
    Object.assign(window, {
      SpeechSynthesisUtterance: class {
        text: string
        voice: unknown = null
        lang = ''
        rate = 1
        pitch = 1
        onend: (() => void) | null = null
        constructor(text: string) {
          this.text = text
        }
      },
    })
  })
}

test('tapping something in a line scene shows and says its word; locked lines are grey', async ({ page }) => {
  await stubSpeech(page)
  await onboard(page)
  await page.goto('/')
  const scene = page.getByTestId('scene-u01')
  await scene.scrollIntoViewIfNeeded()
  await scene.locator('[data-item=kan]').click()
  const bubble = page.getByTestId('scene-bubble')
  await expect(bubble).toContainText('看')
  await expect(bubble).toContainText('to look / watch / read')
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1))).toBe('看')
  // the bubble opens the word's page
  await bubble.click()
  await expect(page).toHaveURL(/\/words\/kan$/)

  await page.goto('/')
  const locked = page.getByTestId('scene-u03')
  await expect(locked).toHaveAttribute('data-state', 'locked')
  await expect(locked.getByTestId('scene-hotspot').first()).toBeDisabled()
  await expect(locked).toContainText('Reach this line to colour it in')
})

test('wide screens show the current line in the margin; phones do not', async ({ page }) => {
  await onboard(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByTestId('scene-u02').scrollIntoViewIfNeeded()
  const margin = page.getByTestId('margin-scene')
  await expect(margin).toBeVisible()
  await expect(margin.getByTestId(/^scene-u0\d$/)).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(margin).toBeHidden()
})
