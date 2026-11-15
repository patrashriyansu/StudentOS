import axios from 'axios'
import { clearStoredAuth, getAccessToken, getRefreshToken, saveTokens } from './authStorage'

const rawApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
const BASE_URL = rawApiUrl
  ? rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`
  : '/api/v1'

export const api = axios.create({ baseURL: BASE_URL, timeout: 20000 })

let refreshPromise: Promise<string> | null = null

function notifyAuthExpired() {
  clearStoredAuth()
  window.dispatchEvent(new Event('studentos:auth-expired'))
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/login') || originalRequest?.url?.startsWith('/auth/register') || originalRequest?.url?.startsWith('/auth/refresh')

    if (err.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        notifyAuthExpired()
        return Promise.reject(err)
      }

      originalRequest._retry = true
      refreshPromise = refreshPromise || axios.post(`${BASE_URL}/auth/refresh`, undefined, {
        timeout: 20000,
        headers: { Authorization: `Bearer ${refreshToken}` },
      }).then((res) => {
        saveTokens(res.data.access_token, res.data.refresh_token)
        return res.data.access_token as string
      }).finally(() => {
        refreshPromise = null
      })

      try {
        const token = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch {
        notifyAuthExpired()
      }
    }

    return Promise.reject(err)
  }
)
