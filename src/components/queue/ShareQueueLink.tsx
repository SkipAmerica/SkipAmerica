import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Share, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/app/providers/auth-provider';

export function ShareQueueLink() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const queueUrl = `${window.location.origin}/join-queue/${user.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(queueUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with friends to give them priority access to your queue.",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my live video queue',
          text: 'Join my queue for priority access to live video calls!',
          url: queueUrl,
        });
      } catch (error) {
        // User cancelled sharing or error occurred
        handleCopyLink();
      }
    } else {
      // Fallback to copy for browsers that don't support Web Share API
      handleCopyLink();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share className="h-5 w-5" />
          Share Queue Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Send this link to friends to give them priority access to your queue.
        </p>
        
        <div className="flex gap-2">
          <Input 
            value={queueUrl}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            onClick={handleCopyLink}
            size="sm"
            variant="outline"
            className="flex-shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleShare}
            className="flex-1"
          >
            <Share className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>Priority Access:</strong> Friends who join via this link will be placed at the front of your queue.
        </div>
      </CardContent>
    </Card>
  );
}