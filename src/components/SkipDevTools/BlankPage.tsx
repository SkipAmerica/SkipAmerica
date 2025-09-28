import { ViewportDrawer } from './ViewportDrawer';
import { QueueContent } from './QueueContent';
import { Button } from '@/components/ui/button';

// Blank development page component
export function BlankPage() {
  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center">
      <ViewportDrawer 
        trigger={<Button>View Queue (Enhanced)</Button>}
        title="Development Queue"
        description="Enhanced reusable drawer with queue content"
        config={{ size: 'lg', variant: 'default', peek: true }}
      >
        <QueueContent />
      </ViewportDrawer>
    </div>
  )
}