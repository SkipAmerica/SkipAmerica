import { useState, useCallback } from 'react'

export interface AsyncActionState<TData = any> {
  loading: boolean
  error: string | null
  data: TData | null
}

export function useAsyncAction<TData = any, TArgs extends any[] = any[]>(
  action: (...args: TArgs) => Promise<TData>
) {
  const [state, setState] = useState<AsyncActionState<TData>>({
    loading: false,
    error: null,
    data: null,
  })

  const execute = useCallback(
    async (...args: TArgs) => {
      setState({ loading: true, error: null, data: null })
      try {
        const data = await action(...args)
        setState({ loading: false, error: null, data })
        return data
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred'
        setState({ loading: false, error: errorMessage, data: null })
        throw error
      }
    },
    [action]
  )

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}