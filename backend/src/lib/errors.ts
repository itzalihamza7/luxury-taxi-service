import type { ErrorRequestHandler, RequestHandler } from 'express'

/** An error with an HTTP status and a stable machine-readable code the frontend can translate. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    /** Per-field error codes, keyed by dotted path (e.g. `contact.email`). */
    readonly fields?: Record<string, string>,
  ) {
    super(message ?? code)
    this.name = 'HttpError'
  }
}

export const badRequest = (code: string, message?: string, fields?: Record<string, string>) =>
  new HttpError(400, code, message, fields)
export const unauthorized = (code = 'UNAUTHENTICATED', message = 'Sign in to continue.') =>
  new HttpError(401, code, message)
export const forbidden = (code = 'FORBIDDEN', message = 'You do not have access to this resource.') =>
  new HttpError(403, code, message)
export const notFound = (code = 'NOT_FOUND', message = 'Not found.') => new HttpError(404, code, message)
export const conflict = (code: string, message?: string) => new HttpError(409, code, message)

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound())
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, fields: error.fields } })
    return
  }

  // Errors raised by express.json() for malformed or oversized bodies.
  const status = typeof error?.status === 'number' ? error.status : undefined
  if (status === 400 || status === 413) {
    const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON'
    res.status(status).json({ error: { code, message: 'The request body could not be read.' } })
    return
  }

  console.error('[api] unhandled error:', error)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } })
}
