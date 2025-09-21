/**
 * Safe error handling utilities for logging and debugging
 */

export interface NormalizedError {
  name?: string
  message: string
  code?: string | number
  stack?: string
  cause?: any
  meta: Record<string, any>
}

/**
 * JSON stringify with cycle-safe replacer and size limits
 */
export function safeStringify(input: any, maxBytes = 2048): string {
  const seen = new WeakSet()
  
  try {
    const json = JSON.stringify(input, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'
        }
        seen.add(value)
      }
      
      // Handle functions and undefined
      if (typeof value === 'function') {
        return '[Function]'
      }
      
      return value
    }, 2)
    
    // Truncate if too large
    if (json.length <= maxBytes) {
      return json
    }
    
    return json.substring(0, maxBytes - 3) + '...'
  } catch (err) {
    // Fallback for any other serialization issues
    return `[Serialization Error: ${String(err)}]`
  }
}

/**
 * Normalize any error into a consistent, serializable structure
 */
export function normalizeError(err: any, meta: Record<string, any> = {}): NormalizedError {
  const normalized: NormalizedError = {
    message: 'Unknown error occurred',
    meta: {
      mode: import.meta.env.MODE,
      timestamp: new Date().toISOString(),
      ...meta
    }
  }

  if (err instanceof Error) {
    // Standard JavaScript Error
    normalized.name = err.name
    normalized.message = err.message || 'Error occurred'
    normalized.stack = err.stack
    normalized.cause = (err as any).cause
    
    // Copy enumerable properties
    Object.keys(err).forEach(key => {
      if (!['name', 'message', 'stack', 'cause'].includes(key)) {
        normalized.meta[key] = (err as any)[key]
      }
    })
  } else if (err && typeof err === 'object') {
    // Object-like error (API errors, custom errors, etc)
    normalized.name = err.name || 'ObjectError'
    normalized.message = err.message || err.error || err.msg || 'Error occurred'
    normalized.code = err.code || err.status || err.statusCode
    normalized.stack = err.stack
    normalized.cause = err.cause || err.details
    
    // Merge additional properties into meta
    Object.keys(err).forEach(key => {
      if (!['name', 'message', 'error', 'msg', 'code', 'status', 'statusCode', 'stack', 'cause', 'details'].includes(key)) {
        normalized.meta[key] = err[key]
      }
    })
  } else if (typeof err === 'string') {
    // String error
    normalized.message = err
  } else {
    // Fallback for any other type
    const errorValue = String(err?.message ?? err ?? 'Unknown error')
    normalized.message = errorValue
    normalized.meta.originalValue = err
    
    // Wrap into proper Error to get stack trace
    try {
      const wrappedError = new Error(errorValue)
      normalized.stack = wrappedError.stack
    } catch (wrapErr) {
      normalized.meta.wrapError = String(wrapErr)
    }
  }

  return normalized
}