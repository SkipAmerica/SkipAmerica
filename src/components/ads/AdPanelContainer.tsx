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
  stickyOffset = 'var(--ad-panel-offset)',
  zIndex = 40,
  className
}) => {
  const getPositionStyles = () => {
    const baseStyles: React.CSSProperties = { zIndex };
    
    switch (position) {
      case 'sticky':
        return placement === 'top' 
          ? { ...baseStyles, position: 'sticky' as const, top: `var(--ad-panel-offset)` }
          : placement === 'bottom'
          ? { ...baseStyles, position: 'sticky' as const, bottom: 0 }
          : { ...baseStyles, position: 'relative' as const };
      case 'fixed':
        return placement === 'top'
          ? { ...baseStyles, position: 'fixed' as const, top: `var(--ad-panel-offset)`, left: 0, right: 0 }
          : placement === 'bottom'
          ? { ...baseStyles, position: 'fixed' as const, bottom: 0, left: 0, right: 0 }
          : { ...baseStyles, position: 'relative' as const };
      case 'static':
      default:
        return { ...baseStyles, position: 'relative' as const };
    }
  };

  return (
    <div 
      className={cn(className)}
      style={getPositionStyles()}
    >
      {children}
    </div>
  );
};