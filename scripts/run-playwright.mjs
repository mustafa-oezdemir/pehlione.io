import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const homeCacheDir = path.join(os.homedir(), '.cache', 'ms-playwright')
const localLibCacheDir = path.join(rootDir, '.cache', 'playwright-libs')
const playwrightCommand = process.platform === 'win32' ? process.execPath : 'npx'
const playwrightPrefix = process.platform === 'win32'
  ? [path.join(rootDir, 'node_modules', 'playwright', 'cli.js')]
  : ['playwright']
const args = process.argv.slice(2)

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    ...options,
  })

  if (result.error) throw result.error
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1)
}

function collectRequestedProjects(playwrightArgs) {
  const projects = new Set()

  for (let index = 0; index < playwrightArgs.length; index += 1) {
    const arg = playwrightArgs[index]
    if (arg.startsWith('--project=')) {
      projects.add(arg.slice('--project='.length))
      continue
    }

    if (arg === '--project' && playwrightArgs[index + 1]) {
      projects.add(playwrightArgs[index + 1])
    }
  }

  return projects
}

function cacheHasDirectory(prefix, relativeMarkerPath) {
  if (!existsSync(homeCacheDir)) return false

  const candidates = readdirSync(homeCacheDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))

  return candidates.some((candidate) =>
    existsSync(path.join(homeCacheDir, candidate, relativeMarkerPath)),
  )
}

function ensurePlaywrightBrowsers(projects) {
  const browsers = new Set(
    projects.size > 0 ? [...projects] : ['chromium', 'firefox', 'webkit'],
  )
  const missing = []

  if (browsers.has('chromium') &&
      !cacheHasDirectory(
        'chromium_headless_shell-',
        path.join('chrome-headless-shell-linux64', 'chrome-headless-shell'),
      )) {
    missing.push('chromium')
  }

  if (browsers.has('firefox') &&
      !cacheHasDirectory('firefox-', path.join('firefox', 'firefox'))) {
    missing.push('firefox')
  }

  if (browsers.has('webkit') &&
      !cacheHasDirectory('webkit-', path.join('pw_run.sh'))) {
    missing.push('webkit')
  }

  if (missing.length > 0) {
    run(playwrightCommand, [...playwrightPrefix, 'install', ...missing], { cwd: rootDir })
  }
}

function findDebArchive(prefix) {
  if (!existsSync(localLibCacheDir)) return null

  return readdirSync(localLibCacheDir)
    .find((entry) => entry.startsWith(prefix) && entry.endsWith('.deb')) ?? null
}

function ensureLocalLibrary(packageName, relativeLibraryPath, extractFolder) {
  const extractDir = path.join(localLibCacheDir, extractFolder)
  const expectedLibrary = path.join(extractDir, relativeLibraryPath)
  if (existsSync(expectedLibrary)) return path.dirname(expectedLibrary)

  mkdirSync(localLibCacheDir, { recursive: true })
  run('apt', ['download', packageName], { cwd: localLibCacheDir })

  const archiveName = findDebArchive(`${packageName}_`)
  if (!archiveName) {
    throw new Error(`Could not find downloaded archive for ${packageName}`)
  }

  mkdirSync(extractDir, { recursive: true })
  run('dpkg-deb', ['-x', path.join(localLibCacheDir, archiveName), extractDir], {
    cwd: rootDir,
  })

  if (!existsSync(expectedLibrary)) {
    throw new Error(`Library ${relativeLibraryPath} was not extracted from ${packageName}`)
  }

  return path.dirname(expectedLibrary)
}

function buildLinuxLibraryPath() {
  const libraryDirs = [
    ensureLocalLibrary(
      'libasound2t64',
      path.join('usr', 'lib', 'x86_64-linux-gnu', 'libasound.so.2'),
      'asound',
    ),
    ensureLocalLibrary(
      'libnspr4',
      path.join('usr', 'lib', 'x86_64-linux-gnu', 'libnspr4.so'),
      'nspr',
    ),
    ensureLocalLibrary(
      'libnss3',
      path.join('usr', 'lib', 'x86_64-linux-gnu', 'libnss3.so'),
      'nss',
    ),
  ]

  return [...libraryDirs, process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(':')
}

function findFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.unref()
    server.on('error', reject)
    server.listen(0, host, () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port)
          return
        }

        reject(new Error('Could not reserve a free Playwright port'))
      })
    })
  })
}

const requestedProjects = collectRequestedProjects(args)

if (process.platform === 'linux') {
  ensurePlaywrightBrowsers(requestedProjects)
}

const env = { ...process.env }
if (env.CI && !env.PLAYWRIGHT_BASE_URL && !env.PLAYWRIGHT_PORT) {
  const playwrightPort = String(await findFreePort())
  env.PLAYWRIGHT_HOST = env.PLAYWRIGHT_HOST || '127.0.0.1'
  env.PLAYWRIGHT_PORT = playwrightPort
  env.PLAYWRIGHT_BASE_URL = `http://${env.PLAYWRIGHT_HOST}:${playwrightPort}`
  console.log(`Using Playwright base URL ${env.PLAYWRIGHT_BASE_URL}`)
}

if (process.platform === 'linux') {
  env.LD_LIBRARY_PATH = buildLinuxLibraryPath()
}

const result = spawnSync(playwrightCommand, [...playwrightPrefix, ...args], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
