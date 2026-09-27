import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../services/api'

export const fetchExpenses = createAsyncThunk('finance/fetchExpenses', async () => {
  const res = await api.get('/finance/expenses')
  return res.data
})

export const createExpense = createAsyncThunk('finance/createExpense', async (data: any) => {
  const res = await api.post('/finance/expenses', data)
  return res.data
})

export const deleteExpense = createAsyncThunk('finance/deleteExpense', async (id: number) => {
  await api.delete(`/finance/expenses/${id}`)
  return id
})

export const fetchExpenseSummary = createAsyncThunk('finance/fetchSummary', async () => {
  const res = await api.get('/finance/expenses/summary')
  return res.data
})

export const fetchSavingsGoals = createAsyncThunk('finance/fetchSavings', async () => {
  const res = await api.get('/finance/savings')
  return res.data
})

export const createSavingsGoal = createAsyncThunk('finance/createSavings', async (data: any) => {
  const res = await api.post('/finance/savings', data)
  return res.data
})

interface FinanceState {
  expenses: any[]
  summary: any | null
  savingsGoals: any[]
  loading: boolean
  error: string | null
}

const initialState: FinanceState = {
  expenses: [],
  summary: null,
  savingsGoals: [],
  loading: false,
  error: null,
}

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.expenses = action.payload
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload)
      })
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        state.summary = action.payload
      })
      .addCase(fetchSavingsGoals.fulfilled, (state, action) => {
        state.savingsGoals = action.payload
      })
  },
})

export default financeSlice.reducer
