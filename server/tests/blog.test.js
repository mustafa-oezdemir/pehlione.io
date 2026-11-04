import assert from 'node:assert/strict'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { after, before, test } from 'node:test'

process.env.ADMIN_USERNAME = 'blog-test-admin'
process.env.ADMIN_PASSWORD = 'blog-test-password'
process.env.JWT_SECRET = 'blog-test-secret-with-sufficient-length'

const { createApp } = await import('../app.js')
const { createJwtToken } = await import('../services/authService.js')
const { rootDir } = await import('../config/runtime.js')
let server
let base

before(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => server?.close())

function post(body, token = createJwtToken()) {
  return fetch(`${base}/api/blog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

test('blog authoring requires admin JWT and validates input', async () => {
  const unauthorized = await post({ title: 'Test', summary: 'Test', body: 'Test' }, 'invalid')
  assert.equal(unauthorized.status, 401)

  const invalid = await post({ title: '../unsafe', summary: 'Test', body: 'Test', extra: true })
  assert.equal(invalid.status, 400)

  const emptyBody = await post({ title: 'Test', summary: 'Test', body: '   ' })
  assert.equal(emptyBody.status, 400)
})

test('blog post is saved as Markdown with a unique safe slug', async () => {
  const title = `Blog Test ${Date.now()} ../unsafe`
  const body = '## Abschnitt\n\n```js\nconsole.log("ok")\n```'
  const payload = { title, summary: 'Kurzbeschreibung', body }
  const createdSlugs = []

  try {
    for (let index = 0; index < 2; index += 1) {
      const response = await post(payload)
      assert.equal(response.status, 201)
      const { post: saved } = await response.json()
      assert.match(saved.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      createdSlugs.push(saved.slug)
      const file = path.join(rootDir, 'content', 'blog', `${saved.slug}.md`)
      const markdown = await readFile(file, 'utf8')
      assert.match(markdown, /^---\ntitle: /)
      assert.ok(markdown.includes(body))
    }
    assert.notEqual(createdSlugs[0], createdSlugs[1])
  } finally {
    await Promise.all(createdSlugs.map((slug) =>
      rm(path.join(rootDir, 'content', 'blog', `${slug}.md`), { force: true })))
  }
})

test('blog list, read, update and delete lifecycle', async () => {
  const response = await post({ title: `CRUD ${Date.now()}`, summary: 'Original', body: 'Original body' })
  assert.equal(response.status, 201)
  const { post: created } = await response.json()
  const url = `${base}/api/blog/${created.slug}`
  try {
    const listed = await fetch(`${base}/api/blog`)
    assert.equal(listed.status, 200)
    assert.ok((await listed.json()).some((item) => item.slug === created.slug))
    const read = await fetch(url)
    assert.equal((await read.json()).body, 'Original body')
    const unauthorized = await fetch(url, { method: 'DELETE' })
    assert.equal(unauthorized.status, 401)
    const updated = await fetch(url, { method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${createJwtToken()}` },
      body: JSON.stringify({ title: 'Updated', summary: 'New summary', body: 'Updated body' }),
    })
    assert.equal(updated.status, 200)
    const edited = (await updated.json()).post
    assert.equal(edited.date, created.date)
    assert.equal(edited.body, 'Updated body')
    assert.equal((await fetch(`${base}/api/blog/..%2Funsafe`)).status, 404)
    const deleted = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${createJwtToken()}` } })
    assert.equal(deleted.status, 200)
    assert.equal((await fetch(url)).status, 404)
  } finally {
    await rm(path.join(rootDir, 'content', 'blog', `${created.slug}.md`), { force: true })
  }
})
