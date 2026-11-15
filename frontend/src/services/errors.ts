import { AxiosError } from 'axios'

export function getFriendlyApiError(error: unknown, fallback: string) {
  const err = error as AxiosError<any>

  if (err.code === 'ECONNABORTED') {
    return 'The request took too long. Please retry; the server or AI provider may be busy.'
  }

  if (!err.response) {
    return 'Cannot reach the StudentOS server right now. Please check your connection and try again.'
  }

  const detail = err.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg

  if (err.response.status === 503) {
    return 'The StudentOS service is not ready yet. Please try again in a few minutes.'
  }

  if (err.response.status >= 500) {
    return 'StudentOS is having trouble on the server. Please try again in a moment.'
  }

  return fallback
}
