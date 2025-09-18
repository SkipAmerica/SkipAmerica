// Unified error handling
export class APIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export const createAPIError = (error: any): APIError => {
  if (error instanceof APIError) return error
  
  if (error?.message) {
    return new APIError(
      error.message,
      error.code || 'UNKNOWN_ERROR',
      error.details || {}
    )
  }
  
  return new APIError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    { originalError: error }
  )
}

export const handleSupabaseError = (error: any): APIError => {
  if (!error) return new APIError('Unknown error')
  
  const message = error.message || 'Database operation failed'
  const code = error.code || 'DATABASE_ERROR'
  
  return new APIError(message, code, { 
    hint: error.hint,
    details: error.details 
  })
}