import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface LiveSessionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LiveSessionModal({ isOpen, onClose }: LiveSessionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl border-0 bg-card/95 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--live-color))] flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-2">
            You are now accepting sessions
          </h2>
          
          <p className="text-muted-foreground mb-6 text-sm">
            Your live status is active. Fans can now join your queue and book sessions with you.
          </p>
          
          <Button 
            onClick={onClose}
            className="w-full bg-[hsl(var(--live-color))] hover:bg-[hsl(var(--live-color))]/90 text-white font-medium"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}