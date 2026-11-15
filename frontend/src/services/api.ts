import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { store } from '../store'
import { logout } from '../store/slices/authSlice'

const defaultBackend = ['https://studentos-backend-a58j', 'onrender', 'com'].join('.')
const rawApiUrl = (import.meta.env.VITE_API_URL || defaultBackend).replace(/\/+$/, '')
const BASE_URL = rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`

export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 })

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }
type TokenResponse = { access_token: string; refresh_token: string }
let refreshPromise: Promise<TokenResponse> | null = null

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined
    const requestUrl = original?.url || ''
    const isAuthEndpoint = /\/auth\/(login|register|refresh|google|send-otp|verify-otp|reset-password)(\?|$)/.test(requestUrl)

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        store.dispatch(logout())
        return Promise.reject(error)
      }

      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post<TokenResponse>(
            `${BASE_URL}/auth/refresh`,
            null,
            { headers: { Authorization: `Bearer ${refreshToken}` }, timeout: 15000 },
          ).then(({ data }) => {
            if (!data.access_token || !data.refresh_token) {
              throw new Error('The authentication service returned an invalid refresh response.')
            }
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('refreshToken', data.refresh_token)
            store.dispatch({
              type: 'auth/tokenRefreshed',
              payload: { token: data.access_token, refreshToken: data.refresh_token },
            })
            return data
          }).finally(() => {
            refreshPromise = null
          })
        }

        const tokens = await refreshPromise
        original.headers.Authorization = `Bearer ${tokens.access_token}`
        return api(original)
      } catch (refreshError) {
        store.dispatch(logout())
        window.dispatchEvent(new Event('studentos:auth-expired'))
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401 && !isAuthEndpoint) {
      store.dispatch(logout())
      window.dispatchEvent(new Event('studentos:auth-expired'))
    }

    // Network errors and 5xx responses are deliberately surfaced to the UI.
    // Never turn a failed server request into a successful fake/local write.
    return Promise.reject(error)
  },
)
