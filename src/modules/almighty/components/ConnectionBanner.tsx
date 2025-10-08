import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ConnectionBannerProps {
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'
  tokenError?: { is401Or403: boolean; message: string }
  onRetry: () => void
}

export function ConnectionBanner({ connectionState, tokenError, onRetry }: ConnectionBannerProps) {
  if (connectionState === 'connected' || connectionState === 'disconnected') return null
  
  const getMessage = () => {
    if (tokenError?.is401Or403) return 'Session expired. Reopen from Queue.'
    
    switch (connectionState) {
      case 'connecting': return 'Connecting to call...'
      case 'reconnecting': return 'Connection lost. Reconnecting...'
      case 'failed': return 'Connection failed.'
      default: return ''
    }
  }
  
  const getCTA = () => {
    if (tokenError?.is401Or403) return 'Back to Queue'
    if (connectionState === 'failed') return 'Retry'
    return null
  }
  
  return (
    <div className="absolute top-0 left-0 right-0 z-[55] bg-yellow-600/90 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {connectionState !== 'failed' && <Loader2 className="h-4 w-4 animate-spin" />}
        <span className="text-sm font-medium">{getMessage()}</span>
      </div>
      {getCTA() && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="text-white hover:text-white/80">
          {getCTA()}
        </Button>
      )}
    </div>
  )
}
