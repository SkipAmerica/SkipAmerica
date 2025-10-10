import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface NextUpConsentModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onLeaveQueue: () => void;
  creatorName: string;
  creatorTerms?: string;
}

export function NextUpConsentModal({
  isOpen,
  onAgree,
  onLeaveQueue,
  creatorName,
  creatorTerms,
}: NextUpConsentModalProps) {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isRequestingCam, setIsRequestingCam] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Auto-request camera on modal open
  useEffect(() => {
    if (!isOpen) return;

    const requestCamera = async () => {
      setIsRequestingCam(true);
      setCameraError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: true
        });

        setPreviewStream(stream);
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
        }
      } catch (error: any) {
        console.error('[ConsentModal] Camera access failed:', error);
        setCameraError(
          error.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access to continue.'
            : 'Failed to access camera. Please check your device settings.'
        );
      } finally {
        setIsRequestingCam(false);
      }
    };

    requestCamera();

    // Cleanup on modal close
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const handleAgree = () => {
    // Pass stream to parent, don't stop tracks yet
    onAgree();
  };

  const handleLeave = () => {
    // Stop preview tracks
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
    }
    onLeaveQueue();
  };
  return (
    <Dialog open={isOpen} modal>
      <DialogContent 
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="bg-cyan-500 text-white">
              You're Next in Line!
            </Badge>
          </div>
          <DialogTitle className="text-2xl">
            The creator will invite you to start the call
          </DialogTitle>
        </DialogHeader>

        {/* Camera Preview Section */}
        <div className="my-4">
          {isRequestingCam && (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Video className="w-12 h-12 mx-auto mb-2 animate-pulse text-primary" />
                <p className="text-sm text-muted-foreground">Requesting camera access...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cameraError}</AlertDescription>
              <Button onClick={() => window.location.reload()} size="sm" className="mt-2">
                Try Again
              </Button>
            </Alert>
          )}

          {previewStream && !cameraError && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-cyan-500/50">
              <video
                ref={previewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          )}
        </div>

        {/* Information Sections */}
        <DialogDescription className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-cyan-500" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">What happens next</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You are <strong>not in the call yet</strong> — wait for {creatorName} to invite you</li>
                <li>• Your video preview will be visible to {creatorName} once you tap "I Agree & Ready"</li>
                <li>• When invited, you'll enter a private 1-on-1 session</li>
              </ul>
            </div>
          </div>

          {creatorTerms && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-5 h-5 mt-0.5 text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Creator's Terms</p>
                <p className="text-sm text-muted-foreground">{creatorTerms}</p>
              </div>
            </div>
          )}
        </DialogDescription>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleLeave}
            variant="ghost"
            className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            Leave Queue
          </Button>
          <Button
            onClick={handleAgree}
            disabled={!previewStream || !!cameraError}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold"
          >
            I Agree & Ready
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          By clicking "I Agree & Ready", you consent to video preview and the creator's terms.
        </p>
      </DialogContent>
    </Dialog>
  );
}
