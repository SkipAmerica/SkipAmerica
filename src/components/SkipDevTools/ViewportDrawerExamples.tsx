import React, { useState } from 'react';
import { ViewportDrawer } from './ViewportDrawer';
import { Button } from '@/components/ui/button';

// Example usage of the enhanced ViewportDrawer
export function ViewportDrawerExamples() {
  const [isControlledOpen, setIsControlledOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">ViewportDrawer Examples</h2>
      
      {/* Simple Uncontrolled Usage */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">1. Simple Uncontrolled Mode</h3>
        <ViewportDrawer trigger={<Button>Open Simple Drawer</Button>}>
          <p>This is a simple drawer with default settings.</p>
        </ViewportDrawer>
      </div>

      {/* Controlled Usage */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">2. Controlled Mode</h3>
        <Button onClick={() => setIsControlledOpen(true)}>
          Open Controlled Drawer
        </Button>
        <ViewportDrawer
          isOpen={isControlledOpen}
          onClose={() => setIsControlledOpen(false)}
          title="Controlled Drawer"
          description="This drawer is controlled by external state"
        >
          <p>Content managed by parent component state.</p>
        </ViewportDrawer>
      </div>

      {/* Advanced Configuration */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">3. Advanced Configuration</h3>
        <Button onClick={() => setIsAdvancedOpen(true)}>
          Open Advanced Drawer
        </Button>
        <ViewportDrawer
          isOpen={isAdvancedOpen}
          onClose={() => setIsAdvancedOpen(false)}
          title="Advanced Drawer"
          description="Custom size, variant, and footer"
          config={{ 
            size: 'xl', 
            variant: 'floating',
            dismissible: true 
          }}
          footer={
            <div className="flex gap-2 p-4">
              <Button onClick={() => setIsAdvancedOpen(false)}>Cancel</Button>
              <Button variant="default">Save Changes</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p>This drawer demonstrates advanced configuration options:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Custom size (xl)</li>
              <li>Floating variant</li>
              <li>Custom footer with actions</li>
              <li>Controlled state management</li>
            </ul>
          </div>
        </ViewportDrawer>
      </div>

      {/* Size Variants */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">4. Size Variants</h3>
        <div className="flex gap-2 flex-wrap">
          {(['sm', 'md', 'lg', 'xl', 'full'] as const).map((size) => (
            <ViewportDrawer
              key={size}
              trigger={<Button variant="outline" size="sm">{size.toUpperCase()}</Button>}
              title={`${size.toUpperCase()} Drawer`}
              config={{ size }}
            >
              <p>This is a {size} sized drawer.</p>
            </ViewportDrawer>
          ))}
        </div>
      </div>
    </div>
  );
}