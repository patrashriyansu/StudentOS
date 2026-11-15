import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const read = (path) => readFile(join(testDirectory, path), 'utf8')

test('API failures are surfaced instead of converted into fake local successes', async () => {
  const source = await read('../src/services/api.ts')
  assert.doesNotMatch(source, /local-studentos-token|studentos_cache_|studentos_fallback_user/)
  assert.match(source, /return Promise\.reject\(error\)/)
})

test('API client retries protected requests after refreshing an expired token', async () => {
  const source = await read('../src/services/api.ts')
  assert.match(source, /\/auth\/refresh/)
  assert.match(source, /original\._retry = true/)
  assert.match(source, /return api\(original\)/)
})

test('login offers Google only and legacy password pages redirect to it', async () => {
  const app = await read('../src/App.tsx')
  const login = await read('../src/pages/Login.tsx')
  assert.match(app, /path="\\/forgot-password".*Navigate to="\\/login"/s)
  assert.match(app, /path="\\/register".*Navigate to="\\/login"/s)
  assert.match(login, /loginWithGoogle/)
  assert.match(login, /VITE_GOOGLE_CLIENT_ID/)
  assert.match(login, /renderButton/)
  assert.doesNotMatch(login, /Forgot password\\?|Create an account|type="password"/)
})
test('wellness trends are based on saved history instead of fabricated chart values', async () => {
  const source = await read('../src/pages/Wellness.tsx')
  assert.match(source, /\/wellness\/history/)
  assert.match(source, /<LineChart data=\{trendData\}>/)
  assert.doesNotMatch(source, /score: 72|score: 76|score: 70/)
  assert.match(source, /Not enough data/)
})


test('StudentOS Pro upsell card is removed from the sidebar', async () => {
  const layout = await read('../src/components/layout/Layout.tsx')
  assert.doesNotMatch(layout, /StudentOS Pro|Unlock AI tools, advanced analytics|Upgrade Now/)
})

test('coding hub normalizes LeetCode profile URLs and syncs public solved stats', async () => {
  const coding = await read('../src/pages/Coding.tsx')
  const backend = await read('../../backend/coding/routes.py')
  assert.match(coding, /normalizeLeetCodeInput/)
  assert.match(coding, /\/coding\/leetcode\/sync/)
  assert.match(coding, /Sync stats/)
  assert.match(backend, /submitStatsGlobal/)
  assert.match(backend, /total_problems_solved/)
  assert.match(backend, /leetcode\.com\/graphql/)
})
