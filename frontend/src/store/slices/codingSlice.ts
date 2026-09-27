import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../services/api'

export const fetchCodingProfile = createAsyncThunk('coding/fetchProfile', async () => {
  const res = await api.get('/coding/profile')
  return res.data
})

export const updateCodingProfile = createAsyncThunk('coding/updateProfile', async (data: { platform: string; username: string }) => {
  const res = await api.put('/coding/profile', data)
  return res.data
})

export const fetchCodingProblems = createAsyncThunk('coding/fetchProblems', async () => {
  const res = await api.get('/coding/problems')
  return res.data
})

export const fetchDSAProgress = createAsyncThunk('coding/fetchDSAProgress', async () => {
  const res = await api.get('/coding/dsa-progress')
  return res.data
})

export const fetchCodingAnalytics = createAsyncThunk('coding/fetchAnalytics', async () => {
  const res = await api.get('/coding/analytics')
  return res.data
})

interface CodingState {
  profile: any | null
  problems: any[]
  dsaProgress: any[]
  analytics: any | null
  loading: boolean
  error: string | null
}

const initialState: CodingState = {
  profile: null,
  problems: [],
  dsaProgress: [],
  analytics: null,
  loading: false,
  error: null,
}

const codingSlice = createSlice({
  name: 'coding',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCodingProfile.fulfilled, (state, action) => {
        state.profile = action.payload
      })
      .addCase(fetchCodingProblems.fulfilled, (state, action) => {
        state.problems = action.payload
      })
      .addCase(fetchDSAProgress.fulfilled, (state, action) => {
        state.dsaProgress = action.payload
      })
      .addCase(fetchCodingAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload
      })
  },
})

export default codingSlice.reducer
