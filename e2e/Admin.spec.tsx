import { test, expect } from '@playwright/test'

test.describe('Admin access', () => {
  test('top nav Admin button opens the login route', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('banner').getByRole('button', { name: 'Admin' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { level: 1, name: /Geschützter Zugang für neue Inhalte/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Admin-Anmeldung' })).toBeVisible()
  })

  test('upload route redirects to login without an active session', async ({ page }) => {
    await page.goto('/upload')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Admin-Anmeldung' })).toBeVisible()
  })

  test('login form navigates to upload after a successful auth response', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          token: 'playwright.jwt.token',
          expiresIn: 900,
        }),
      })
    })

    await page.goto('/login')
    await page.getByLabel('Benutzername').fill('demo-admin')
    await page.getByLabel('Passwort').fill('demo-password')
    await page.getByRole('button', { name: 'Anmelden' }).click()

    await expect(page).toHaveURL(/\/upload$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Neue Inhalte direkt im Admin-Bereich erfassen/,
      }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: /Neues Foto hinzufügen/ })).toBeVisible()
  })

  test('Verwalten tab creates, edits and deletes a project', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ token: 'playwright.jwt.token', expiresIn: 900 }) })
    })
    await page.addInitScript(() => {
      let items: Array<{ id: string; name: string; description?: string }> = []
      const originalFetch = window.fetch.bind(window)
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (new URL(url, location.href).pathname === '/api/fotografiePhotos') {
          return new Response(JSON.stringify([{ id: '1', name: 'Lilie', title: 'Test photo',
            src: '/foto/orangefarbene-lilie-nahaufnahme.png', category: 'foto', sub_category: 'natur' }]),
          { headers: { 'Content-Type': 'application/json' } })
        }
        if (!/^\/api\/projects(?:\/1)?$/.test(new URL(url, location.href).pathname)) return originalFetch(input, init)
        const method = init?.method || 'GET'
        let status = 200
        let body: unknown = items
        if (method === 'POST') {
          const item = { ...JSON.parse(String(init?.body)), id: '1' }
          items = [item]
          status = 201
          body = { ok: true, item }
        } else if (method === 'PUT') {
          const item = { ...JSON.parse(String(init?.body)), id: '1' }
          items = [item]
          body = { ok: true, item }
        } else if (method === 'DELETE') {
          items = []
          body = { ok: true }
        }
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
      }
    })

    await page.goto('/login')
    await page.getByLabel('Benutzername').fill('admin')
    await page.getByLabel('Passwort').fill('password')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await page.getByRole('tab', { name: 'Verwalten' }).click()
    const thumbnail = page.getByRole('button', { name: 'Test photo' }).locator('img')
    await expect(thumbnail).toBeVisible()
    await expect.poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Test photo' }).click()
    await expect(page.getByRole('img', { name: 'Test photo' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Bereich' }).click()
    await page.getByRole('option', { name: 'Projekte' }).click()
    await expect(page.getByText('0 Einträge')).toBeVisible()
    await page.getByRole('textbox', { name: 'Name' }).fill('New project')
    await page.getByRole('button', { name: 'Speichern', exact: true }).click()
    await expect(page.getByText('1 Einträge')).toBeVisible()
    await page.getByRole('button', { name: 'New project' }).click()
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('New project')
    await page.getByRole('textbox', { name: 'Beschreibung' }).fill('Updated description')
    await page.getByRole('button', { name: 'Speichern', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Löschen' })).toHaveCount(0)
    await page.getByRole('button', { name: 'New project' }).click()
    await expect(page.getByRole('textbox', { name: 'Beschreibung' })).toHaveValue('Updated description')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Löschen' }).click()
    await expect(page.getByText('0 Einträge')).toBeVisible()
  })
})
