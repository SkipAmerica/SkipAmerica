import { ViewportDrawer } from './ViewportDrawer';
import { QueueContent } from './QueueContent';
import { Button } from '@/components/ui/button';

// Blank development page component
export function BlankPage() {
  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center">
      <ViewportDrawer 
        trigger={<Button>View Queue (Enhanced)</Button>}
        config={{ 
          size: 'lg', 
          variant: 'default',
          peekMode: false,
          snapPoints: [0.18, 0.65, 0.95]
        }}
      >
        <QueueContent />
      </ViewportDrawer>
    </div>
  )
}