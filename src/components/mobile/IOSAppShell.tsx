import React from 'react';
import { cn } from '@/lib/utils';

interface IOSAppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function IOSAppShell({ children, className }: IOSAppShellProps) {
  return (
    <div className={cn(
      "ios-app",
      "min-h-screen bg-background",
      "flex flex-col",
      "overflow-hidden",
      "relative",
      className
    )}>
      {children}
    </div>
  );
}