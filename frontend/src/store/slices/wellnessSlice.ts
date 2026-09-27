import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../services/api'

export const fetchWellnessSummary = createAsyncThunk('wellness/fetchSummary', async () => {
  const res = await api.get('/wellness/summary')
  return res.data
})

export const fetchWellnessScore = createAsyncThunk('wellness/fetchScore', async () => {
  const res = await api.get('/wellness/score')
  return res.data
})

export const logMood = createAsyncThunk('wellness/logMood', async (data: { mood_score: number; note?: string; date?: string }) => {
  const res = await api.post('/wellness/mood', data)
  return res.data
})

export const logSleep = createAsyncThunk('wellness/logSleep', async (data: { hours: number; quality?: number; note?: string; date?: string }) => {
  const res = await api.post('/wellness/sleep', data)
  return res.data
})

export const logWater = createAsyncThunk('wellness/logWater', async (data: { glasses: number; goal?: number }) => {
  const res = await api.post('/wellness/water', data)
  return res.data
})

export const logExercise = createAsyncThunk('wellness/logExercise', async (data: { duration_minutes: number; exercise_type: string; note?: string }) => {
  const res = await api.post('/wellness/exercise', data)
  return res.data
})

export const fetchMoodHistory = createAsyncThunk('wellness/fetchMoodHistory', async (days: number = 7) => {
  const res = await api.get(`/wellness/mood/history?days=${days}`)
  return res.data
})

export const fetchSleepHistory = createAsyncThunk('wellness/fetchSleepHistory', async (days: number = 7) => {
  const res = await api.get(`/wellness/sleep/history?days=${days}`)
  return res.data
})

export const fetchWaterToday = createAsyncThunk('wellness/fetchWaterToday', async () => {
  const res = await api.get('/wellness/water/today')
  return res.data
})

interface WellnessState {
  summary: any | null
  score: any | null
  waterToday: { glasses: number; goal: number; percentage: number } | null
  moodHistory: any[]
  sleepHistory: any[]
  loading: boolean
  error: string | null
}

const initialState: WellnessState = {
  summary: null,
  score: null,
  waterToday: null,
  moodHistory: [],
  sleepHistory: [],
  loading: false,
  error: null,
}

const wellnessSlice = createSlice({
  name: 'wellness',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWellnessSummary.fulfilled, (state, action) => {
        state.summary = action.payload
      })
      .addCase(fetchWellnessScore.fulfilled, (state, action) => {
        state.score = action.payload
      })
      .addCase(fetchWaterToday.fulfilled, (state, action) => {
        state.waterToday = action.payload
      })
      .addCase(logWater.fulfilled, (state, action) => {
        state.waterToday = {
          glasses: action.payload.glasses,
          goal: action.payload.goal,
          percentage: action.payload.percentage,
        }
      })
      .addCase(fetchMoodHistory.fulfilled, (state, action) => {
        state.moodHistory = action.payload.history || []
      })
      .addCase(fetchSleepHistory.fulfilled, (state, action) => {
        state.sleepHistory = action.payload.history || []
      })
  },
})

export default wellnessSlice.reducer
