import { ViewportDrawer } from './ViewportDrawer';
import { QueueContent } from './QueueContent';

export function BlankPage() {
  return (
    <div className="w-screen h-screen bg-background">
      {/* No need to center the page — the drawer floats at bottom */}
      <ViewportDrawer minPeekPx={144}>
        <QueueContent />
      </ViewportDrawer>
    </div>
  );
}