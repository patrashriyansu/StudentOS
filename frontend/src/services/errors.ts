import { AxiosError } from 'axios'

export function getFriendlyApiError(error: unknown, fallback: string) {
  const err = error as AxiosError<any>

  if (err.code === 'ECONNABORTED') {
    return 'The StudentOS server is taking too long to respond. It may be waking up, so please try again in a moment.'
  }

  if (!err.response) {
    return 'Cannot reach the StudentOS server right now. Please check your connection and try again.'
  }

  const detail = err.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg

  if (err.response.status >= 500) {
    return 'StudentOS is having trouble on the server. Please try again in a moment.'
  }

  return fallback
}
