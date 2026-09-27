import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import academicsReducer from './slices/academicsSlice'
import codingReducer from './slices/codingSlice'
import wellnessReducer from './slices/wellnessSlice'
import productivityReducer from './slices/productivitySlice'
import financeReducer from './slices/financeSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    academics: academicsReducer,
    coding: codingReducer,
    wellness: wellnessReducer,
    productivity: productivityReducer,
    finance: financeReducer,
  },
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

