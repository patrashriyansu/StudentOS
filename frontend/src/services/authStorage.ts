import { User } from '../types'

export const ACCESS_TOKEN_KEY = 'token'
export const REFRESH_TOKEN_KEY = 'refreshToken'
export const USER_KEY = 'user'

function getStorageValue(key: string) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

export function shouldRememberAuth() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) !== null
}

export function getAccessToken() {
  return getStorageValue(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return getStorageValue(REFRESH_TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const value = getStorageValue(USER_KEY)
  if (!value) return null

  try {
    return JSON.parse(value) as User
  } catch {
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(USER_KEY)
    return null
  }
}

export function saveTokens(accessToken: string, refreshToken: string, rememberMe = true) {
  const target = rememberMe ? localStorage : sessionStorage
  const other = rememberMe ? sessionStorage : localStorage
  target.setItem(ACCESS_TOKEN_KEY, accessToken)
  target.setItem(REFRESH_TOKEN_KEY, refreshToken)
  other.removeItem(ACCESS_TOKEN_KEY)
  other.removeItem(REFRESH_TOKEN_KEY)
}

export function saveUser(user: User, rememberMe = true) {
  const target = rememberMe ? localStorage : sessionStorage
  const other = rememberMe ? sessionStorage : localStorage
  target.setItem(USER_KEY, JSON.stringify(user))
  other.removeItem(USER_KEY)
}

export function saveAuth(accessToken: string, refreshToken: string, user: User, rememberMe = true) {
  saveTokens(accessToken, refreshToken, rememberMe)
  saveUser(user, rememberMe)
}

export function clearStoredAuth() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY)
    storage.removeItem(REFRESH_TOKEN_KEY)
    storage.removeItem(USER_KEY)
  }
}
