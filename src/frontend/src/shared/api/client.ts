const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly current: Record<string, unknown> | null

  constructor(
    status: number,
    code: string,
    message: string,
    current: Record<string, unknown> | null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.current = current
  }
}

type ErrorBody = {
  code?: string
  message?: string
  current?: Record<string, unknown> | null
}

export function errorFromBody(status: number, data: ErrorBody | null): ApiError {
  return new ApiError(
    status,
    data?.code ?? 'error',
    data?.message ?? 'Ошибка запроса',
    data?.current ?? null,
  )
}

export const versionConflictNotice =
  'Данные уже обновлены. Проверьте актуальную версию и сохраните правку заново.'

export function isVersionConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409 && error.current !== null
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  const data = text ? (JSON.parse(text) as ErrorBody) : null
  if (!response.ok) {
    throw errorFromBody(response.status, data)
  }
  return data as T
}
