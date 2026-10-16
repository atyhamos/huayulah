import { expect, test, type Page } from '@playwright/test'
import { onboard, playLesson } from './helpers'

/** 1×1 PNG, enough for createImageBitmap. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function addWord(page: Page, hanzi: string, meaning: string) {
  await page.getByTestId('reader-word').filter({ hasText: hanzi }).click()
  await page.getByTestId('word-meaning').fill(meaning)
  await page.getByTestId('add-word').click()
  await expect(page.getByTestId('word-sheet')).toBeHidden()
}

test('paste text, save words to My words, practise them, see them in Review', async ({ page }) => {
  const start = new Date('2026-05-04T09:00:00')
  await page.clock.setFixedTime(start)
  await onboard(page)
  await page.goto('/reader')
  await page.getByTestId('reader-text').fill('卤面 罗惹 板面')
  await page.getByTestId('reader-read').click()
  await expect(page.getByTestId('reader-line')).toHaveCount(1)
  await addWord(page, '卤面', 'lor mee')
  await addWord(page, '罗惹', 'rojak')
  await addWord(page, '板面', 'ban mian')

  await page.goto('/words')
  await page.getByRole('button', { name: 'My words · 3' }).click()
  await expect(page.getByTestId('word-row')).toHaveCount(3)
  await page.getByTestId('practise-mine').click()
  await playLesson(page)
  await expect(page.getByTestId('lesson-complete')).toContainText('+3 words added to your flashcards')
  await page.getByTestId('done').click()

  // a few days later they come up for review like course words
  await page.clock.setFixedTime(new Date(start.getTime() + 5 * 864e5))
  await page.goto('/review')
  await page.getByTestId('start-review').click()
  const seen = new Set<string>()
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId('review-done').isVisible()) break
    seen.add(await page.getByTestId('flashcard').innerText())
    await page.getByTestId('flashcard').click()
    const good = page.getByTestId('rate-good')
    if (await good.isVisible()) await good.click()
    else await page.getByRole('button', { name: 'Continue' }).click()
  }
  expect([...seen].some((t) => t.includes('卤面') || t.includes('lor mee'))).toBe(true)
})

test('reads a photo with Claude when a key is saved (mocked API)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('huayu-ai-key', 'sk-ant-test'))
  let body: { model?: string; messages?: { content: { type: string }[] }[] } = {}
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    body = route.request().postDataJSON()
    const answer = {
      title: 'Hawker stall menu',
      lines: [
        {
          zh: '鸡饭',
          pinyin: 'jī fàn',
          en: 'Chicken rice',
          words: [{ hanzi: '鸡饭', pinyin: 'jī fàn', english: 'chicken rice', note: '' }],
        },
        {
          zh: '卤面',
          pinyin: 'lǔ miàn',
          en: 'Lor mee',
          words: [{ hanzi: '卤面', pinyin: 'lǔ miàn', english: 'lor mee', note: 'Hokkien braised noodles' }],
        },
      ],
    }
    return route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(answer) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    })
  })
  await onboard(page)
  await page.goto('/reader')
  await page.getByTestId('reader-file').setInputFiles({ name: 'menu.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByTestId('reader-result')).toContainText('Hawker stall menu')
  expect(body.model).toBe('claude-opus-5-5')
  expect(body.messages?.[0].content[0].type).toBe('image')
  // a course word opens its page; a new one can be saved with Claude's meaning
  await page.getByTestId('reader-word').filter({ hasText: '卤面' }).click()
  await expect(page.getByTestId('word-sheet')).toContainText('Hokkien braised noodles')
  await page.getByTestId('add-word').click()
  await page.goto('/words')
  await expect(page.getByRole('button', { name: 'My words · 1' })).toBeVisible()
})
