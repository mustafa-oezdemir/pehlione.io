import { test, expect } from '@playwright/test'

test.describe('Blog navigation', () => {
  test('opens blog from top navigation and returns to a home section', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('banner').getByRole('button', { name: 'Blog' }).click()
    await expect(page).toHaveURL(/\/blog$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()

    await page.getByRole('banner').getByRole('button', { name: 'Projekte' }).click()
    await expect(page).toHaveURL(/\/#projects$/)
  })

  test.describe('narrow screen', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('opens blog from drawer', async ({ page }) => {
      await page.goto('/')
      await page.getByLabel('open drawer').click()
      await page.getByRole('button', { name: /^Blog Wissen/ }).click()

      await expect(page).toHaveURL(/\/blog$/)
      await expect(page.getByRole('heading', { level: 2, name: 'Alle Beiträge' })).toBeVisible()
    })
  })

  test('opens blog directly and survives reload', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
    await expect(page.getByText('Noch keine Blogbeiträge veröffentlicht.', { exact: false })).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/blog$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
  })
})
