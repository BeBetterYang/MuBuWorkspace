import { expect, test } from '@playwright/test'

test('keeps the workspace inside the iPad viewport with touch-sized primary controls', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.app-shell')).toBeVisible()

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth)
  expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.innerHeight)

  const headerBox = await page.locator('header').first().boundingBox()
  expect(headerBox).not.toBeNull()
  expect(headerBox!.x).toBeGreaterThanOrEqual(0)
  expect(headerBox!.x + headerBox!.width).toBeLessThanOrEqual(viewport.innerWidth + 1)

  const primaryTargets = page.locator('header button:visible')
  const targetCount = await primaryTargets.count()
  expect(targetCount).toBeGreaterThan(2)
  for (let index = 0; index < targetCount; index += 1) {
    const box = await primaryTargets.nth(index).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(43)
    expect(box!.height).toBeGreaterThanOrEqual(43)
  }
})

test('uses an overlay sidebar in portrait and a docked sidebar in landscape', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const sidebar = page.locator('aside').first()
  await expect(sidebar).toBeVisible()
  const position = await sidebar.evaluate((element) => getComputedStyle(element).position)
  expect(position).toBe(testInfo.project.name === 'ipad-portrait' ? 'fixed' : 'relative')
})
