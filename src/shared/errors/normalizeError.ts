/**
 * Normalize any error to a consistent structure
 * Always returns a structured error object with optional fields
 */
export interface NormalizedError {
  name?: string
  message: string
  code?: string | number
  stack?: string
  cause?: any
  meta?: Record<string, any>
}

export function normalizeError(err: any, meta?: Record<string, any>): NormalizedError {
  const normalized: NormalizedError = {
    message: 'Unknown error occurred',
    meta: { ...meta }
  }

  if (err instanceof Error) {
    // Standard JavaScript Error
    normalized.name = err.name
    normalized.message = err.message || 'Error occurred'
    normalized.stack = err.stack
    normalized.cause = (err as any).cause
  } else if (err && typeof err === 'object') {
    // Object-like error (API errors, custom errors, etc)
    normalized.name = err.name
    normalized.message = err.message || err.error || err.msg || 'Error occurred'
    normalized.code = err.code || err.status || err.statusCode
    normalized.stack = err.stack
    normalized.cause = err.cause || err.details
    
    // Merge any additional error properties into meta
    const errorMeta = { ...err }
    delete errorMeta.name
    delete errorMeta.message
    delete errorMeta.error
    delete errorMeta.msg
    delete errorMeta.code
    delete errorMeta.status
    delete errorMeta.statusCode
    delete errorMeta.stack
    delete errorMeta.cause
    delete errorMeta.details
    
    normalized.meta = { ...normalized.meta, ...errorMeta }
  } else if (typeof err === 'string') {
    // String error
    normalized.message = err
  } else {
    // Fallback for any other type
    normalized.message = String(err)
    normalized.meta = { ...normalized.meta, originalValue: err }
  }

  return normalized
}