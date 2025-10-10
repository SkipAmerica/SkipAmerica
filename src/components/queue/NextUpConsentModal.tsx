import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useMedia } from '@/modules/almighty/providers/MediaProvider';

interface NextUpConsentModalProps {
  open: boolean;
  creatorName: string;
  onConsented: () => void;
  onLeaveQueue: () => void;
}

export function NextUpConsentModal({
  open,
  creatorName,
  onConsented,
  onLeaveQueue,
}: NextUpConsentModalProps) {
  const { 
    localVideo, 
    previewOnly, 
    permissionError, 
    retryPermissions,
    connecting 
  } = useMedia()
  
  const [isAgreed, setIsAgreed] = useState(false)
  const previewRef = useRef<HTMLVideoElement>(null)

  // Auto-request camera when modal opens (only once)
  useEffect(() => {
    if (!open || localVideo) return

    console.log('[ConsentModal] Requesting camera preview...')
    previewOnly().catch(err => {
      console.error('[ConsentModal] Camera request failed:', err)
    })
  }, [open, localVideo, previewOnly])

  // Attach video track to preview element
  useEffect(() => {
    if (!localVideo?.track || !previewRef.current) return

    console.log('[ConsentModal] Attaching preview track to video element')
    const videoElement = previewRef.current
    
    try {
      localVideo.track.attach?.(videoElement)
      videoElement.muted = true
      videoElement.playsInline = true
      videoElement.autoplay = true
      
      videoElement.play().catch(err => {
        console.warn('[ConsentModal] Video play failed:', err)
      })
    } catch (err) {
      console.error('[ConsentModal] Failed to attach track:', err)
    }

    return () => {
      try {
        localVideo.track.detach?.(videoElement)
      } catch (err) {
        console.warn('[ConsentModal] Failed to detach track:', err)
      }
    }
  }, [localVideo])

  const handleAgree = () => {
    if (!localVideo) {
      console.error('[ConsentModal] Cannot agree - no video stream')
      return
    }
    
    setIsAgreed(true)
    onConsented()
  }

  const handleLeave = () => {
    onLeaveQueue()
  }

  const handleRetry = () => {
    console.log('[ConsentModal] Retrying camera access...')
    retryPermissions()
  }

  return (
    <Dialog open={open} modal>
      <DialogContent 
        className="sm:max-w-lg rounded-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <Badge variant="default" className="bg-cyan-500 text-white w-fit mb-2">
            You're Next in Line!
          </Badge>
          <DialogTitle className="text-2xl">
            The creator will invite you to start the call
          </DialogTitle>
        </DialogHeader>

        {/* Camera Preview Section */}
        <div className="my-4">
          {connecting && (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Video className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Requesting camera access...</p>
              </div>
            </div>
          )}

          {permissionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {permissionError.type === 'denied' 
                  ? 'Camera permission denied. Please allow camera access to continue.'
                  : permissionError.type === 'not_found'
                  ? 'No camera found. Please connect a camera to continue.'
                  : 'Failed to access camera. Please check your device settings.'}
              </AlertDescription>
              <Button onClick={handleRetry} size="sm" className="mt-2">
                Try Again
              </Button>
            </Alert>
          )}

          {localVideo && !permissionError && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-cyan-500/50">
              <video
                ref={previewRef}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          )}
        </div>

        {/* Information */}
        <DialogDescription className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-cyan-500 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">What happens next</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You are <strong>not in the call yet</strong> — wait for {creatorName} to invite you</li>
                <li>• Your video preview will be visible to {creatorName} once you tap "I Agree & Ready"</li>
                <li>• When invited, you'll enter a private 1-on-1 session</li>
              </ul>
            </div>
          </div>
        </DialogDescription>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleLeave}
            variant="destructive"
            className="flex-1"
            disabled={isAgreed}
          >
            Leave Queue
          </Button>
          <Button
            onClick={handleAgree}
            disabled={!localVideo || !!permissionError || connecting || isAgreed}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold"
          >
            {isAgreed ? 'Processing...' : 'I Agree & Ready'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          By clicking "I Agree & Ready", you consent to video preview and the creator's terms.
        </p>
      </DialogContent>
    </Dialog>
  )
}
