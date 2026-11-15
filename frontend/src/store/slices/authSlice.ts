import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, User } from '../../types'
import { api } from '../../services/api'
import { getFriendlyApiError } from '../../services/errors'
import { clearStoredAuth, getAccessToken, getRefreshToken, getStoredUser, saveAuth, shouldRememberAuth } from '../../services/authStorage'

const initialState: AuthState = {
  user: getStoredUser(),
  token: getAccessToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: false,
  loading: false,
  initialized: false,
}

export const initializeAuth = createAsyncThunk('auth/initialize', async (_, { rejectWithValue }) => {
  const token = getAccessToken()
  if (!token) return null

  try {
    const rememberMe = shouldRememberAuth()
    const { data: user } = await api.get<User>('/auth/me')
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()
    if (!accessToken || !refreshToken) return null
    saveAuth(accessToken, refreshToken, user, rememberMe)
    return { token: accessToken, refreshToken, user }
  } catch (err) {
    clearStoredAuth()
    return rejectWithValue(getFriendlyApiError(err, 'Your session has expired. Please sign in again.'))
  }
})

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, rememberMe = true }: { email: string; password: string; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const userRes = await api.get<User>('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } })
      saveAuth(data.access_token, data.refresh_token, userRes.data, rememberMe)
      return { token: data.access_token, refreshToken: data.refresh_token, user: userRes.data }
    } catch (err) {
      return rejectWithValue(getFriendlyApiError(err, 'Login failed. Please check your email and password.'))
    }
  },
)

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async ({ idToken, rememberMe = true }: { idToken: string; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/google', { id_token: idToken }, { timeout: 30000 })
      const userRes = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      saveAuth(data.access_token, data.refresh_token, userRes.data, rememberMe)
      return { token: data.access_token, refreshToken: data.refresh_token, user: userRes.data }
    } catch (err) {
      return rejectWithValue(getFriendlyApiError(err, 'Google sign-in failed. Please try again.'))
    }
  },
)

export const loginWithOAuthTokens = createAsyncThunk(
  'auth/loginWithOAuthTokens',
  async ({ accessToken, refreshToken, rememberMe = true }: {
    accessToken: string; refreshToken: string; rememberMe?: boolean
  }, { rejectWithValue }) => {
    try {
      const userRes = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      saveAuth(accessToken, refreshToken, userRes.data, rememberMe)
      return { token: accessToken, refreshToken, user: userRes.data }
    } catch (err) {
      return rejectWithValue(getFriendlyApiError(err, 'Social sign-in could not be completed. Please try again.'))
    }
  },
)

export const register = createAsyncThunk('auth/register', async ({ email, password, name, role }: { email: string; password: string; name: string; role: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', { email, password, name, role }, { timeout: 30000 })
    const userRes = await api.get<User>('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } })
    saveAuth(data.access_token, data.refresh_token, userRes.data)
    return { token: data.access_token, refreshToken: data.refresh_token, user: userRes.data }
  } catch (err) { return rejectWithValue(getFriendlyApiError(err, 'Registration failed. Please check your details and try again.')) }
})

const authSlice = createSlice({
  name: 'auth', initialState, reducers: {
    logout(state) {
      state.user = null; state.token = null; state.refreshToken = null; state.isAuthenticated = false
      state.initialized = true
      clearStoredAuth()
    },
    setUser(state, action: PayloadAction<User>) { state.user = action.payload },
    tokenRefreshed(state, action: PayloadAction<{ token: string; refreshToken: string }>) {
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = true
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeAuth.pending, (s) => { s.loading = true })
    builder.addCase(initializeAuth.fulfilled, (s, a) => {
      s.loading = false; s.initialized = true
      if (a.payload) {
        s.user = a.payload.user; s.token = a.payload.token; s.refreshToken = a.payload.refreshToken; s.isAuthenticated = true
      } else {
        s.user = null; s.token = null; s.refreshToken = null; s.isAuthenticated = false
      }
    })
    builder.addCase(initializeAuth.rejected, (s) => {
      s.loading = false; s.initialized = true; s.user = null; s.token = null; s.refreshToken = null; s.isAuthenticated = false
    })
    builder.addCase(login.pending, (s) => { s.loading = true })
    builder.addCase(login.fulfilled, (s, a) => { s.loading = false; s.initialized = true; s.user = a.payload.user; s.token = a.payload.token; s.refreshToken = a.payload.refreshToken; s.isAuthenticated = true })
    builder.addCase(login.rejected, (s) => { s.loading = false; s.initialized = true })
    builder.addCase(loginWithGoogle.pending, (s) => { s.loading = true })
    builder.addCase(loginWithGoogle.fulfilled, (s, a) => {
      s.loading = false; s.initialized = true; s.user = a.payload.user; s.token = a.payload.token; s.refreshToken = a.payload.refreshToken; s.isAuthenticated = true
    })
    builder.addCase(loginWithGoogle.rejected, (s) => { s.loading = false; s.initialized = true })
    builder.addCase(loginWithOAuthTokens.pending, (s) => { s.loading = true })
    builder.addCase(loginWithOAuthTokens.fulfilled, (s, a) => {
      s.loading = false; s.initialized = true; s.user = a.payload.user
      s.token = a.payload.token; s.refreshToken = a.payload.refreshToken; s.isAuthenticated = true
    })
    builder.addCase(loginWithOAuthTokens.rejected, (s) => { s.loading = false; s.initialized = true })
    builder.addCase(register.pending, (s) => { s.loading = true })
    builder.addCase(register.fulfilled, (s, a) => { s.loading = false; s.initialized = true; s.user = a.payload.user; s.token = a.payload.token; s.refreshToken = a.payload.refreshToken; s.isAuthenticated = true })
    builder.addCase(register.rejected, (s) => { s.loading = false; s.initialized = true })
  }
})

export const { logout, setUser, tokenRefreshed } = authSlice.actions
export default authSlice.reducer
