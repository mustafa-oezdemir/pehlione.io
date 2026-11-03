import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = fileURLToPath(new URL('../dist/', import.meta.url))
const blogDir = join(distDir, 'blog')
const contentDir = fileURLToPath(new URL('../content/blog/', import.meta.url))

mkdirSync(blogDir, { recursive: true })
copyFileSync(join(distDir, 'index.html'), join(blogDir, 'index.html'))

for (const name of readdirSync(contentDir)) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name)) continue
  const slugDir = join(blogDir, name.slice(0, -3))
  mkdirSync(slugDir, { recursive: true })
  copyFileSync(join(distDir, 'index.html'), join(slugDir, 'index.html'))
}
