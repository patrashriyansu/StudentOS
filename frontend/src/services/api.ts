import axios from 'axios'
import { store } from '../store'
import { logout } from '../store/slices/authSlice'

const rawApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
const BASE_URL = rawApiUrl
  ? rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`
  : '/api/v1'

export const api = axios.create({ baseURL: BASE_URL, timeout: 20000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) store.dispatch(logout())
    return Promise.reject(err)
  }
)
