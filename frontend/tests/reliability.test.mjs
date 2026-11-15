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

test('password recovery screen is registered and linked from login', async () => {
  const app = await read('../src/App.tsx')
  const login = await read('../src/pages/Login.tsx')
  const reset = await read('../src/pages/ForgotPassword.tsx')
  assert.match(app, /path="\/forgot-password"/)
  assert.match(login, /Forgot password\?/)
  assert.match(reset, /\/auth\/send-otp/)
  assert.match(reset, /\/auth\/reset-password/)
  assert.match(reset, /password !== confirmPassword/)
})

test('wellness trends are based on saved history instead of fabricated chart values', async () => {
  const source = await read('../src/pages/Wellness.tsx')
  assert.match(source, /\/wellness\/history/)
  assert.match(source, /<LineChart data=\{trendData\}>/)
  assert.doesNotMatch(source, /score: 72|score: 76|score: 70/)
  assert.match(source, /Not enough data/)
})
