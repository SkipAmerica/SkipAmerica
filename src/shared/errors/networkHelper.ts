import { normalizeError } from './normalizeError'

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  signal?: AbortSignal
}

interface NetworkError extends Error {
  name: 'HttpError'
  code: number
  meta: {
    url: string
    method: string
    status: number
    responseSnippet: string
    requestId?: string
  }
}

/**
 * Enhanced fetch wrapper with detailed error logging
 * Logs URL, method, status, response snippet, and request headers
 */
export async function fetchWithErrorHandling(
  url: string, 
  options: RequestOptions = {}
): Promise<Response> {
  const method = options.method || 'GET'
  const requestId = Math.random().toString(36).substring(2, 8)
  
  console.info(`[NETWORK][${requestId}] ${method} ${url}`, {
    headers: options.headers,
    hasBody: !!options.body
  })

  let response: Response
  try {
    response = await fetch(url, options)
  } catch (networkError) {
    const normalized = normalizeError(networkError, {
      step: 'network_request',
      url,
      method,
      requestId
    })
    console.error(`[NETWORK][${requestId}] Network error:`, normalized)
    throw networkError
  }

  // Log response
  console.info(`[NETWORK][${requestId}] ${method} ${url} → ${response.status}`, {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  })

  // Handle non-2xx responses
  if (!response.ok) {
    let responseSnippet = ''
    try {
      const text = await response.clone().text()
      responseSnippet = text.length > 2048 ? text.substring(0, 2048) + '...' : text
    } catch (readError) {
      responseSnippet = `[Unable to read response: ${readError}]`
    }

    const error = new Error(`${method} ${url} → ${response.status}`) as NetworkError
    error.name = 'HttpError'
    error.code = response.status
    error.meta = {
      url,
      method,
      status: response.status,
      responseSnippet,
      requestId
    }

    console.error(`[NETWORK][${requestId}] HTTP error:`, normalizeError(error))
    throw error
  }

  return response
}