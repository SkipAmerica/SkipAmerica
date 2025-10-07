import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, CheckCircle2, AlertCircle } from 'lucide-react';

interface NextUpConsentModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onDecline: () => void;
  creatorName: string;
  creatorTerms?: string; // Future: Creator's custom terms
}

export function NextUpConsentModal({
  isOpen,
  onAgree,
  onDecline,
  creatorName,
  creatorTerms,
}: NextUpConsentModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="bg-primary text-primary-foreground">
              You're Next Up!
            </Badge>
          </div>
          <DialogTitle className="text-2xl">Ready to meet {creatorName}?</DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Video className="w-5 h-5 mt-0.5 text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Your camera will activate</p>
                <p className="text-sm text-muted-foreground">
                  {creatorName} will be able to see your video preview before starting the call.
                </p>
              </div>
            </div>

            {creatorTerms && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <AlertCircle className="w-5 h-5 mt-0.5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Creator's Terms</p>
                  <p className="text-sm text-muted-foreground">{creatorTerms}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">What happens next</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your video will be visible to {creatorName}</li>
                  <li>• Wait for the creator to start your call</li>
                  <li>• You'll be redirected to a private call room</li>
                </ul>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onDecline}
            className="flex-1"
          >
            Not Ready
          </Button>
          <Button
            onClick={onAgree}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            I Agree - Start Broadcasting
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          By clicking "I Agree", you consent to video broadcasting and the creator's terms.
        </p>
      </DialogContent>
    </Dialog>
  );
}
