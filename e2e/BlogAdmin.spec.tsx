import { test, expect } from '@playwright/test'

test('admin can save a Markdown blog post locally', async ({ page }) => {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'playwright.jwt.token', expiresIn: 900 }),
    })
  })

  let savedBody: Record<string, string> | null = null
  let authorization = ''
  await page.route('**/api/blog', async (route) => {
    savedBody = route.request().postDataJSON()
    authorization = route.request().headers().authorization
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, post: { slug: 'mein-erster-beitrag' } }),
    })
  })

  await page.goto('/login')
  await page.getByLabel('Benutzername').fill('admin')
  await page.getByLabel('Passwort').fill('password')
  await page.getByRole('button', { name: 'Anmelden' }).click()

  await expect(page).toHaveURL(/\/upload$/)
  await page.getByRole('tab', { name: 'Blog' }).click()
  await page.getByLabel('Blogtitel').fill('Mein erster Beitrag')
  await page.getByLabel('Kurzbeschreibung').fill('Eine kurze Zusammenfassung')
  await page.getByLabel('Markdown-Inhalt').fill('## Abschnitt\n\n```js\nconsole.log("ok")\n```')
  await page.getByRole('button', { name: 'Blogbeitrag lokal speichern' }).click()

  await expect(page.getByText('Beitrag lokal gespeichert.')).toBeVisible()
  expect(authorization).toBe('Bearer playwright.jwt.token')
  expect(savedBody).toEqual({
    title: 'Mein erster Beitrag',
    summary: 'Eine kurze Zusammenfassung',
    body: '## Abschnitt\n\n```js\nconsole.log("ok")\n```',
  })
})
