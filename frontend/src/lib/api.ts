import type { CommonMessages } from '@/i18n/messages/common'

/** A failed API call, carrying the backend's stable error code and per-field codes. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/** Call the backend through the site's own `/api` gateway (browser only). */
export async function api<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'network', 'Network error')
  }

  return readResponse<T>(response)
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const details = (payload as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error
    throw new ApiError(response.status, details?.code ?? 'generic', details?.message ?? 'Request failed', details?.fields ?? {})
  }
  return payload as T
}

/** Upload an image from the console; the answer carries the address to show it from. */
export async function uploadImage(image: Blob): Promise<string> {
  let response: Response
  try {
    response = await fetch('/api/admin/media', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': image.type }, body: image })
  } catch {
    throw new ApiError(0, 'network', 'Network error')
  }
  return (await readResponse<{ media: { url: string } }>(response)).media.url
}

/** Translate an error into a message for the visitor. Unknown errors get a generic message. */
export function errorMessage(error: unknown, t: CommonMessages): string {
  if (error instanceof ApiError) {
    const known = t.errors as Record<string, string>
    return known[error.code] ?? t.errors.generic
  }
  return t.errors.generic
}

/** Translate a per-field error code. */
export function fieldMessage(code: string | undefined, t: CommonMessages): string | undefined {
  if (!code) return undefined
  const known = t.fields as Record<string, string>
  return known[code] ?? t.fields.invalid
}

export const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
