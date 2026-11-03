import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = fileURLToPath(new URL('../dist/', import.meta.url))
const blogDir = join(distDir, 'blog')

mkdirSync(blogDir, { recursive: true })
copyFileSync(join(distDir, 'index.html'), join(blogDir, 'index.html'))
