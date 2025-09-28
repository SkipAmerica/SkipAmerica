import { ViewportDrawer } from './ViewportDrawer';
import { QueueContent } from './QueueContent';

// Blank development page component
export function BlankPage() {
  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center">
      <ViewportDrawer>
        <QueueContent />
      </ViewportDrawer>
    </div>
  )
}