import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface PermissionPromptProps {
  error: Error
  errorType: 'denied' | 'not_found' | 'in_use' | 'unknown'
  onRetry: () => void
  onDismiss: () => void
}

export function PermissionPrompt({ error, errorType, onRetry, onDismiss }: PermissionPromptProps) {
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  const getTitle = () => {
    switch (errorType) {
      case 'denied': return 'Camera & Microphone Access Needed'
      case 'not_found': return 'No Media Devices Found'
      case 'in_use': return 'Camera or Microphone In Use'
      default: return 'Media Error'
    }
  }
  
  const getMessage = () => {
    if (errorType === 'denied' && isIOS) {
      return 'Please enable camera and microphone access: Settings → Safari → Camera/Microphone → Allow'
    }
    if (errorType === 'denied') {
      return 'Please allow camera and microphone access in your browser settings.'
    }
    if (errorType === 'not_found') {
      return 'No camera or microphone detected on your device.'
    }
    if (errorType === 'in_use') {
      return 'Your camera or microphone is being used by another app. Please close other apps and try again.'
    }
    return error.message || 'Could not access your camera or microphone.'
  }
  
  return (
    <div
      className="absolute inset-0 bg-black/95 flex items-center justify-center z-[60] p-6"
      aria-hidden={false}
      role="dialog"
      aria-labelledby="permission-title"
    >
      <div className="max-w-md w-full bg-background rounded-lg p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 id="permission-title" className="text-lg font-semibold mb-2">
              {getTitle()}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {getMessage()}
            </p>
            <div className="flex gap-3">
              <Button onClick={onRetry} className="flex-1">
                Try Again
              </Button>
              <Button onClick={onDismiss} variant="outline" className="flex-1">
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
