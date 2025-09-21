import { normalizeError, safeStringify } from './err-utils'

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  signal?: AbortSignal
}

/**
 * Enhanced fetch wrapper with detailed error logging and normalized errors
 */
export async function requestWithDetail(
  url: string, 
  options: RequestOptions = {}
): Promise<Response> {
  const method = options.method || 'GET'
  const requestId = Math.random().toString(36).substring(2, 8)
  
  console.info(`[NETWORK][${requestId}] ${method} ${url}`, {
    headers: options.headers,
    hasBody: !!options.body,
    mode: import.meta.env.MODE
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
    console.error(`[NETWORK][${requestId}] Network error:`, safeStringify(normalized))
    throw normalized
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

    const errorMessage = `${method} ${url} → ${response.status}`
    const httpError = new Error(errorMessage)
    httpError.name = 'HttpError'
    ;(httpError as any).code = response.status
    
    const normalized = normalizeError(httpError, {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      responseSnippet,
      requestId
    })

    console.error(`[NETWORK][${requestId}] HTTP error:`, safeStringify(normalized))
    throw normalized
  }

  return response
}