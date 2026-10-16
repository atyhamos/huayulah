import { expect, test, type Page } from '@playwright/test'
import { onboard } from './helpers'

/** A fake recogniser that "hears" the current shadowing line, minus its last character. */
async function fakeRecognition(page: Page) {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = ''
      interimResults = false
      maxAlternatives = 1
      continuous = false
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        setTimeout(() => {
          const zh = (document.querySelector('[data-testid=shadow-line]') as HTMLElement | null)?.dataset.zh ?? '你好'
          const heard = zh.replace(/[，。？！、]/g, '').slice(0, -1)
          const result = Object.assign([{ transcript: heard, confidence: 0.9 }], { isFinal: true })
          this.onresult?.({ resultIndex: 0, results: [result] })
          this.onend?.()
        }, 30)
      }
      stop() {}
      abort() {}
    }
    Object.assign(window, { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: FakeRecognition })
  })
}

test('shadowing a story line by line shows which characters came through', async ({ page }) => {
  await fakeRecognition(page)
  await onboard(page)
  await page.goto('/shadow/story-u01')
  for (let i = 0; i < 20; i++) {
    if (await page.getByTestId('lesson-complete').isVisible()) break
    await page.getByTestId('mic').click()
    await expect(page.getByTestId('shadow-score')).toBeVisible()
    // the last character was "missed"
    await expect(page.getByTestId('shadow-marks').locator('ruby.text-rose-500')).not.toHaveCount(0)
    await page.getByTestId('shadow-next').click()
  }
  await expect(page.getByTestId('lesson-complete')).toContainText('Shadowing complete!')
})

test('role-play with a mocked Claude reply, correction and finish', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('huayu-ai-key', 'sk-ant-test'))
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  let calls = 0
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    calls++
    const reply = { zh: '好，咖啡乌一杯。打包吗？', en: 'OK, one kopi-O. Take away?', correction: '我要一杯咖啡乌', hint: '打包 dǎ bāo (take away)', done: calls >= 2 }
    return route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify({
        id: `msg_${calls}`,
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(reply) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    })
  })
  await onboard(page)
  await page.goto('/talk/u03')
  await expect(page.getByTestId('talk-tat')).toHaveCount(1)
  await page.getByTestId('talk-input').fill('one kopi o please')
  await page.getByTestId('talk-send').click()
  // report any page errors along with the bubble count if this fails
  await expect
    .poll(async () => `${await page.getByTestId('talk-tat').count()} | ${errors.join(' || ')} | ${(await page.locator('body').innerText()).slice(0, 300)}`)
    .toMatch(/^2 \|/)
  await expect(page.getByTestId('talk-correction')).toContainText('Try')
  await expect(page.getByTestId('talk-correction').locator('ruby')).toHaveCount(7)
  await page.getByTestId('talk-hint').click()
  await expect(page.getByText('打包 dǎ bāo (take away)')).toBeVisible()
  await page.getByTestId('talk-input').fill('打包')
  await page.getByTestId('talk-send').click()
  await page.getByTestId('talk-finish').click()
  await expect(page.getByTestId('lesson-complete')).toContainText('Chat complete!')
})
