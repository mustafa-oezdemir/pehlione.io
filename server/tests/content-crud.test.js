import assert from 'node:assert/strict'
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'

const directory = await mkdtemp(path.join(os.tmpdir(), 'pehlione-content-test-'))
process.env.CONTENT_DB_PATH = path.join(directory, 'db.json')
process.env.ADMIN_USERNAME = 'crud-test-admin'
process.env.ADMIN_PASSWORD = 'crud-test-password'
process.env.JWT_SECRET = 'crud-test-secret-with-sufficient-length'

const { createApp } = await import('../app.js')
const { createJwtToken } = await import('../services/authService.js')
const { rootDir } = await import('../config/runtime.js')
let server
let base

before(async () => {
  await copyFile(path.join(rootDir, 'server', 'db.json'), process.env.CONTENT_DB_PATH)
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await new Promise((resolve) => server?.close(resolve))
  await rm(directory, { recursive: true, force: true })
})

function request(resource, method, body, authorized = true) {
  return fetch(`${base}/api/${resource}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${createJwtToken()}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

test('collection CRUD requires JWT and persists changes', async () => {
  const forbidden = await request('projects', 'POST', { name: 'CRUD test' }, false)
  assert.equal(forbidden.status, 401)
  const created = await request('projects', 'POST', { name: 'CRUD test', repoUrl: 'https://example.com/repo' })
  assert.equal(created.status, 201)
  const id = (await created.json()).item.id
  try {
    const read = await request(`projects/${id}`, 'GET')
    assert.equal(read.status, 200)
    assert.equal((await read.json()).name, 'CRUD test')
    const patch = await request(`projects/${id}`, 'PATCH', { description: 'Changed' })
    assert.equal(patch.status, 200)
    assert.equal((await patch.json()).item.repoUrl, 'https://example.com/repo')
    const cleared = await request(`projects/${id}`, 'PATCH', { repoUrl: '' })
    assert.equal(cleared.status, 200)
    assert.equal((await cleared.json()).item.repoUrl, undefined)
    const put = await request(`projects/${id}`, 'PUT', { name: 'Replaced' })
    assert.equal(put.status, 200)
    assert.equal((await put.json()).item.description, undefined)
    assert.equal((await request(`projects/${id}`, 'DELETE', null, false)).status, 401)
    assert.equal((await request(`projects/${id}`, 'DELETE')).status, 200)
    assert.equal((await request(`projects/${id}`, 'GET')).status, 404)
    assert.equal((await request(`projects/${id}`, 'DELETE')).status, 404)
  } finally {
    await request(`projects/${id}`, 'DELETE')
  }
})

test('all collections validate payloads and unknown collections stay inaccessible', async () => {
  const cases = [
    ['fotografiePhotos', { src: '/foto/test.png', name: 'test', title: 'Test', category: 'foto', sub_category: 'natur' }],
    ['gardenPhotos', { src: '/garten/test.png', name: 'test', title: 'Test', category: 'garten', sub_category: 'blumen' }],
    ['certificates', { name: 'Test', img: '/certificates/test.png' }],
    ['schwerpunkte', { text: 'Test' }],
  ]
  for (const [resource, payload] of cases) {
    const response = await request(resource, 'POST', payload)
    assert.equal(response.status, 201, resource)
    const id = (await response.json()).item.id
    assert.equal((await request(`${resource}/${id}`, 'GET')).status, 200)
    assert.equal((await request(`${resource}/${id}`, 'PATCH', { id: '999' })).status, 400)
    assert.equal((await request(`${resource}/${id}`, 'DELETE')).status, 200)
  }
  assert.equal((await request('other', 'GET')).status, 404)
  assert.equal((await request('other', 'POST', { text: 'X' })).status, 404)
  assert.equal((await request('fotografiePhotos', 'POST', { ...cases[0][1], src: '/foto/../x.png' })).status, 400)
  assert.equal((await request('gardenPhotos/5', 'PUT', { src: '/garten/gemüse.png', name: 'gemüse',
    title: 'Gemüsegarten', category: 'foto', sub_category: 'gemüse' })).status, 200)
})

test('concurrent creates receive unique IDs without losing records', async () => {
  const responses = await Promise.all(Array.from({ length: 25 }, (_, i) =>
    request('schwerpunkte', 'POST', { text: `Concurrent ${i}` })))
  assert.ok(responses.every((response) => response.status === 201))
  const ids = await Promise.all(responses.map(async (response) => (await response.json()).item.id))
  assert.equal(new Set(ids).size, 25)
  const items = JSON.parse(await readFile(process.env.CONTENT_DB_PATH, 'utf8')).schwerpunkte
  assert.equal(items.filter((item) => item.text.startsWith('Concurrent ')).length, 25)
  await Promise.all(ids.map((id) => request(`schwerpunkte/${id}`, 'DELETE')))
})
