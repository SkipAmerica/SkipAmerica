// Example usage patterns for the reusable AdPanel component
import React from 'react';
import { AdPanel } from './AdPanel';
import { AdPanelContainer } from './AdPanelContainer';

// Example 1: Simple inline usage
export const InlineAdExample = () => (
  <div>
    <h2>Some content</h2>
    <AdPanel variant="compact" />
    <p>More content below the ad</p>
  </div>
);

// Example 2: Sticky header placement (like current usage)
export const StickyHeaderAdExample = () => (
  <div>
    <div className="sticky top-0 bg-white">
      <h1>Page Header</h1>
    </div>
    <AdPanelContainer position="sticky" placement="top" stickyOffset="calc(var(--debug-safe-top) + 48px)">
      <AdPanel />
    </AdPanelContainer>
    <div>
      <p>Page content that scrolls under the ad panel</p>
    </div>
  </div>
);

// Example 3: Footer placement
export const FooterAdExample = () => (
  <div>
    <div className="min-h-screen">
      <p>Page content</p>
    </div>
    <AdPanelContainer position="sticky" placement="bottom">
      <AdPanel variant="large" />
    </AdPanelContainer>
  </div>
);

// Example 4: Custom styling
export const CustomStyledAdExample = () => (
  <AdPanel 
    variant="compact"
    background="white"
    showBorder={true}
    borderColor="muted"
    className="rounded-lg shadow-sm"
  />
);

// Example 5: Multiple instances
export const MultipleAdExample = () => (
  <div className="space-y-8">
    <AdPanel variant="compact" background="transparent" showBorder={false} />
    <div className="content">
      <p>Content section 1</p>
    </div>
    <AdPanel variant="default" />
    <div className="content">
      <p>Content section 2</p>
    </div>
    <AdPanel variant="large" background="white" />
  </div>
);