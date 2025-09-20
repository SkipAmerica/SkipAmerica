import React from 'react';
import { cn } from '@/lib/utils';

interface AdPanelContainerProps {
  children: React.ReactNode;
  position?: 'sticky' | 'static' | 'fixed';
  placement?: 'top' | 'bottom' | 'inline';
  stickyOffset?: string;
  zIndex?: number;
  className?: string;
}

export const AdPanelContainer: React.FC<AdPanelContainerProps> = ({
  children,
  position = 'sticky',
  placement = 'top',
  stickyOffset = 'calc(var(--debug-safe-top) + 48px)',
  zIndex = 40,
  className
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'sticky':
        return placement === 'top' 
          ? `sticky top-[${stickyOffset}]`
          : placement === 'bottom'
          ? 'sticky bottom-0'
          : 'relative';
      case 'fixed':
        return placement === 'top'
          ? `fixed top-[${stickyOffset}] left-0 right-0`
          : placement === 'bottom'
          ? 'fixed bottom-0 left-0 right-0'
          : 'relative';
      case 'static':
      default:
        return 'relative';
    }
  };

  return (
    <div 
      className={cn(
        getPositionClasses(),
        `z-[${zIndex}]`,
        className
      )}
    >
      {children}
    </div>
  );
};