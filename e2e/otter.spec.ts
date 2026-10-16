import { expect, test } from '@playwright/test'

const webgl = () => !!document.createElement('canvas').getContext('webgl')

test('Ah Tat plays his clips, and stays on screen after a tap', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Huayulah')
  const art = page.getByTestId('otter-art').first()
  await expect(art).toHaveAttribute('data-mood', 'wave')
  if (!(await page.evaluate(webgl))) {
    // no WebGL here: he's a still, which must still show
    await expect(art.locator('img')).toBeVisible()
    return
  }
  await expect(art).toHaveAttribute('data-ready', 'video', { timeout: 10_000 })
  await page.getByTestId('otter').click()
  await expect(page.getByTestId('otter-bubble')).toBeVisible()
  // the hop must not swap out the canvas the player draws to
  await page.waitForTimeout(900)
  await expect(art).toHaveAttribute('data-ready', 'video')
  await expect(art.locator('canvas')).toHaveCount(1)
  expect(await art.locator('canvas').evaluate((c) => c.isConnected && (c as HTMLCanvasElement).width > 0)).toBe(true)
})

test('with reduced motion he is a still of the right mood', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const art = page.getByTestId('otter-art').first()
  await expect(art.locator('canvas')).toHaveCount(0)
  await expect(art.locator('img')).toHaveAttribute('src', /\/otter\/wave(-sm)?\.webp$/)
  expect(await art.locator('img').evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)).toBe(true)
})
