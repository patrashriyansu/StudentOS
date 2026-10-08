import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, User } from '../../types'
import { api } from '../../services/api'
import { getFriendlyApiError } from '../../services/errors'

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
}

export const login = createAsyncThunk('auth/login', async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('refreshToken', data.refresh_token)
    const userRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } })
    localStorage.setItem('user', JSON.stringify(userRes.data))
    return { token: data.access_token, refreshToken: data.refresh_token, user: userRes.data }
  } catch (err) { return rejectWithValue(getFriendlyApiError(err, 'Login failed. Please check your email and password.')) }
})

export const register = createAsyncThunk('auth/register', async ({ email, password, name, role }: { email: string; password: string; name: string; role: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', { email, password, name, role }, { timeout: 30000 })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('refreshToken', data.refresh_token)
    const userRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } })
    localStorage.setItem('user', JSON.stringify(userRes.data))
    return { token: data.access_token, refreshToken: data.refresh_token, user: userRes.data }
  } catch (err) { return rejectWithValue(getFriendlyApiError(err, 'Registration failed. Please check your details and try again.')) }
})

const authSlice = createSlice({
  name: 'auth', initialState, reducers: {
    logout(state) {
      state.user = null; state.token = null; state.refreshToken = null; state.isAuthenticated = false
      localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user')
    },
    setUser(state, action: PayloadAction<User>) { state.user = action.payload },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (s) => { s.loading = true })
    builder.addCase(login.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; s.refreshToken = a.payload.refreshToken; s.isAuthenticated = true })
    builder.addCase(login.rejected, (s) => { s.loading = false })
    builder.addCase(register.pending, (s) => { s.loading = true })
    builder.addCase(register.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; s.refreshToken = a.payload.refreshToken; s.isAuthenticated = true })
    builder.addCase(register.rejected, (s) => { s.loading = false })
  }
})

export const { logout, setUser } = authSlice.actions
export default authSlice.reducer
