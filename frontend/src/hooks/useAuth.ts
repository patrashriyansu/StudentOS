import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { login, register, logout } from '../store/slices/authSlice'
import { useCallback } from 'react'

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user, token, isAuthenticated, loading } = useSelector((s: RootState) => s.auth)
  return {
    user, token, isAuthenticated, loading,
    login: useCallback((email: string, password: string) => dispatch(login({ email, password })), [dispatch]),
    register: useCallback((email: string, password: string, name: string, role: string) => dispatch(register({ email, password, name, role })), [dispatch]),
    logout: useCallback(() => dispatch(logout()), [dispatch]),
  }
}
