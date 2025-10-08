import React, { createContext, useContext, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

interface SessionContextValue {
  sessionId: string
  role: 'creator' | 'user'
  startTime: number
  duration: number
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const role = (searchParams.get('role') as 'creator' | 'user') || 'creator'
  const [startTime] = useState(Date.now())
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Date.now() - startTime)
    }, 1000)

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Analytics] session_start', { sessionId, role })
    }

    return () => {
      clearInterval(interval)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Analytics] session_end', {
          sessionId,
          role,
          durationMs: Date.now() - startTime
        })
      }
    }
  }, [sessionId, role, startTime])

  if (!sessionId) {
    throw new Error('SessionProvider requires sessionId param')
  }

  return (
    <SessionContext.Provider value={{ sessionId, role, startTime, duration }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
