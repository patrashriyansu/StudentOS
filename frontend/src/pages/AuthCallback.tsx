import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AlertCircle, GraduationCap, Loader2 } from 'lucide-react'
import { AppDispatch } from '../store'
import { loginWithOAuthTokens } from '../store/slices/authSlice'

export default function AuthCallback() {
  const [error, setError] = useState('')
  const started = useRef(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  useEffect(() => {
    if (started.current) return
    started.current = true

    const values = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = values.get('access_token')
    const refreshToken = values.get('refresh_token')
    const providerError = values.get('error')

    window.history.replaceState(null, document.title, window.location.pathname + window.location.search)

    if (providerError || !accessToken || !refreshToken) {
      setError(providerError || 'The identity provider did not return a valid StudentOS session.')
      return
    }

    dispatch(loginWithOAuthTokens({ accessToken, refreshToken }))
      .unwrap()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((reason: unknown) => {
        setError(typeof reason === 'string' ? reason : 'Sign-in could not be completed. Please try again.')
      })
  }, [dispatch, navigate])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5ff] px-4 text-[#101943]">
      <div className="w-full max-w-md rounded-3xl border border-white bg-white p-9 text-center shadow-xl">
        <GraduationCap size={42} className="mx-auto mb-4 text-[#3158ed]" />
        {error ? (
          <>
            <AlertCircle size={30} className="mx-auto mb-3 text-rose-500" />
            <h1 className="text-xl font-bold">Sign-in was not completed</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-rose-700">{error}</p>
            <Link to="/login" className="mt-6 inline-flex rounded-xl bg-[#3158ed] px-5 py-3 font-semibold text-white">Back to sign in</Link>
          </>
        ) : (
          <>
            <Loader2 size={25} className="mx-auto mb-3 animate-spin text-[#3158ed]" />
            <h1 className="text-xl font-bold">Finishing your sign-in</h1>
            <p className="mt-2 text-sm text-[#536080]">Connecting your secure StudentOS session…</p>
          </>
        )}
      </div>
    </main>
  )
}
