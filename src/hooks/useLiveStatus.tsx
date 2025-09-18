import { useState, useCallback } from 'react'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'

interface LiveStatusState {
  isLive: boolean
  // Future extensions can be added here:
  // liveSessionId?: string
  // liveStartTime?: Date
  // liveSettings?: LiveSettings
}

export const useLiveStatus = () => {
  const [liveStatus, setLiveStatus] = useLocalStorage<LiveStatusState>('live-status', {
    isLive: false
  })

  const toggleLiveStatus = useCallback(() => {
    setLiveStatus(prev => ({
      ...prev,
      isLive: !prev.isLive
    }))
  }, [setLiveStatus])

  const goLive = useCallback(() => {
    setLiveStatus(prev => ({
      ...prev,
      isLive: true
    }))
  }, [setLiveStatus])

  const endLive = useCallback(() => {
    setLiveStatus(prev => ({
      ...prev,
      isLive: false
    }))
  }, [setLiveStatus])

  return {
    isLive: liveStatus.isLive,
    toggleLiveStatus,
    goLive,
    endLive
  }
}