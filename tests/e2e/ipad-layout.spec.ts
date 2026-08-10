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

test('applies the shared DESIGN.md tokens to primary actions and surfaces', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    return {
      primary: root.getPropertyValue('--color-primary').trim(),
      buttonRadius: root.getPropertyValue('--radius-button').trim(),
      cardRadius: root.getPropertyValue('--radius-card').trim(),
    }
  })
  expect(tokens).toEqual({ primary: '#1a1a1a', buttonRadius: '8px', cardRadius: '12px' })

  const createButton = page.locator('aside .ui-icon-button-primary').first()
  await expect(createButton).toBeVisible()
  const visual = await createButton.evaluate((element) => {
    const style = getComputedStyle(element)
    return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius }
  })
  expect(visual).toEqual({ backgroundColor: 'rgb(26, 26, 26)', borderRadius: '9999px' })
})

test('uses an overlay sidebar in portrait and a docked sidebar in landscape', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const sidebar = page.locator('aside').first()
  await expect(sidebar).toBeVisible()
  const position = await sidebar.evaluate((element) => getComputedStyle(element).position)
  expect(position).toBe(testInfo.project.name === 'ipad-portrait' ? 'fixed' : 'relative')
})

test('keeps the sidebar docked at compact landscape widths', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 698 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const sidebar = page.locator('aside').first()
  await expect(sidebar).toBeVisible()
  await expect(sidebar).toHaveCSS('position', 'relative')
  await expect(page.getByRole('button', { name: '关闭侧边栏' })).toBeHidden()
})

test('reopens the sidebar after it has been collapsed', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const collapseButton = page.getByTitle('收起侧栏')
  if (await collapseButton.isVisible()) await collapseButton.click()

  const expandButton = page.getByTitle('展开侧边栏 Ctrl + \\')
  await expect(expandButton).toBeVisible()
  const expandBox = await expandButton.boundingBox()
  expect(expandBox).not.toBeNull()
  expect(Math.abs(expandBox!.y + expandBox!.height / 2 - (await page.evaluate(() => window.innerHeight)) / 2)).toBeLessThanOrEqual(2)
  await expandButton.click()
  await expect(page.getByRole('textbox', { name: '搜索文档' })).toBeVisible()
})

test('opens the theme panel without clipping it inside the canvas toolbar', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const closeSidebar = page.getByRole('button', { name: '关闭侧边栏' })
  if (await closeSidebar.isVisible()) await closeSidebar.click({ position: { x: 800, y: 500 } })
  await page.getByRole('button', { name: '思维导图' }).click()
  await page.getByRole('button', { name: '展开导图工具' }).click()
  await page.getByRole('button', { name: '配色与背景' }).click()

  const themeButton = page.getByRole('button', { name: '配色 清风' })
  await expect(themeButton).toBeVisible()
  const box = await themeButton.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
})
