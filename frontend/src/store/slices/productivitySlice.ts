import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../services/api'

export const fetchTasks = createAsyncThunk('productivity/fetchTasks', async () => {
  const res = await api.get('/productivity/tasks')
  return res.data
})

export const createTask = createAsyncThunk('productivity/createTask', async (data: any) => {
  const res = await api.post('/productivity/tasks', data)
  return res.data
})

export const updateTask = createAsyncThunk('productivity/updateTask', async ({ id, data }: { id: number; data: any }) => {
  const res = await api.put(`/productivity/tasks/${id}`, data)
  return res.data
})

export const deleteTask = createAsyncThunk('productivity/deleteTask', async (id: number) => {
  await api.delete(`/productivity/tasks/${id}`)
  return id
})

export const fetchHabits = createAsyncThunk('productivity/fetchHabits', async () => {
  const res = await api.get('/productivity/habits')
  return res.data
})

export const createHabit = createAsyncThunk('productivity/createHabit', async (data: any) => {
  const res = await api.post('/productivity/habits', data)
  return res.data
})

export const toggleHabit = createAsyncThunk('productivity/toggleHabit', async (id: number) => {
  const res = await api.post(`/productivity/habits/${id}/log`)
  return { id, ...res.data }
})

export const logPomodoroSession = createAsyncThunk('productivity/logPomodoro', async (data: { duration_minutes: number; subject?: string }) => {
  const res = await api.post('/productivity/pomodoro', data)
  return res.data
})

export const fetchProductivitySummary = createAsyncThunk('productivity/fetchSummary', async () => {
  const res = await api.get('/productivity/summary')
  return res.data
})

interface ProductivityState {
  tasks: any[]
  habits: any[]
  summary: any | null
  loading: boolean
  error: string | null
}

const initialState: ProductivityState = {
  tasks: [],
  habits: [],
  summary: null,
  loading: false,
  error: null,
}

const productivitySlice = createSlice({
  name: 'productivity',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.tasks = action.payload
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload)
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = action.payload
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload)
      })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.habits = action.payload
      })
      .addCase(toggleHabit.fulfilled, (state, action) => {
        const habit = state.habits.find((h) => h.id === action.payload.id)
        if (habit) {
          habit.done_today = action.payload.done_today
          habit.current_streak = action.payload.streak
        }
      })
      .addCase(fetchProductivitySummary.fulfilled, (state, action) => {
        state.summary = action.payload
      })
  },
})

export default productivitySlice.reducer
