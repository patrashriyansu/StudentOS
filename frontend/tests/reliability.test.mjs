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

test('login keeps password and Google sign-in without GitHub or Microsoft buttons', async () => {
  const app = await read('../src/App.tsx')
  const login = await read('../src/pages/Login.tsx')
  const callback = await read('../src/pages/AuthCallback.tsx')
  const auth = await read('../src/store/slices/authSlice.ts')
  assert.ok(app.includes('<Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />'))
  assert.ok(app.includes('<Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />'))
  assert.ok(app.includes('<Route path="/auth/callback" element={<AuthCallback />} />'))
  assert.ok(login.includes('loginWithGoogle'))
  assert.ok(login.includes('login({ email: email.trim(), password, rememberMe })'))
  assert.ok(login.includes('VITE_GOOGLE_CLIENT_ID'))
  assert.ok(login.includes('Forgot password?'))
  assert.ok(login.includes('Remember me'))
  assert.ok(login.includes('Create an account'))
  assert.doesNotMatch(login, /GitHub|Microsoft|github|microsoft/)
  assert.ok(login.includes('/images/studentos-login-hero.webp'))
  assert.doesNotMatch(login, /Main navigation|>Home<|>Features<|>About<|Get Started/)
  assert.doesNotMatch(login, /<nav/)
  assert.doesNotMatch(login, /href="#(home|features|about|login-form)"/)
  assert.ok(callback.includes('loginWithOAuthTokens'))
  assert.ok(auth.includes('loginWithOAuthTokens'))
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
