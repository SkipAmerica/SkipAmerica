import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { DrawerProps } from '@/shared/types/ui';
import { cn } from '@/lib/utils';

const sizeClasses = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]', 
  lg: 'max-h-[80vh]',
  xl: 'max-h-[90vh]',
  full: 'max-h-screen'
};

const peekFractions = {
  sm: 0.22,
  md: 0.28,
  lg: 0.5,
  xl: 0.36,
  full: 0.40
};

const variantClasses = {
  default: 'rounded-t-lg border-0 border-t',
  minimal: 'rounded-t-2xl border-0',
  floating: 'rounded-t-3xl border shadow-lg m-2 max-w-[calc(100vw-1rem)]'
};

export function ViewportDrawer({ 
  // Controlled mode props
  isOpen,
  onClose,
  onOpenChange,
  // Uncontrolled mode props
  trigger,
  // Configuration
  title,
  description,
  config = { size: 'lg', variant: 'default', dismissible: true, peekMode: true },
  // Content sections
  header,
  footer,
  children,
  className
}: DrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled state
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen);
      if (!newOpen) onClose?.();
    } else {
      setInternalOpen(newOpen);
    }
  };

  const sizeClass = sizeClasses[config.size || 'lg'];
  const variantClass = variantClasses[config.variant || 'default'];
  
  // Configure peek mode snapPoints
  const snapPoints = config.peekMode !== false 
    ? [peekFractions[config.size || 'lg'], 1]
    : config.snapPoints;

  const drawerContent = (
    <DrawerContent 
      className={cn(
        'w-screen max-w-none',
        sizeClass,
        variantClass,
        className
      )}
    >
      <div className="mx-auto w-full h-full flex flex-col">
        {/* Header Section */}
        {(title || description || header) && (
          <DrawerHeader>
            {title && <DrawerTitle>{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
            {header}
          </DrawerHeader>
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {children || (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Reusable Drawer</h3>
              <p className="text-muted-foreground">
                This drawer supports both controlled and uncontrolled modes with flexible configuration.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  Size: {config.size} | Variant: {config.variant}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Section */}
        {footer || (
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </div>
    </DrawerContent>
  );

  // Controlled mode - no trigger needed
  if (isControlled) {
    return (
      <Drawer 
        open={open} 
        onOpenChange={handleOpenChange}
        dismissible={config.dismissible}
        snapPoints={snapPoints}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Uncontrolled mode - requires trigger
  return (
    <Drawer 
      open={open} 
      onOpenChange={handleOpenChange}
      dismissible={config.dismissible}
      snapPoints={snapPoints}
    >
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="outline">Open Drawer</Button>
        )}
      </DrawerTrigger>
      {drawerContent}
    </Drawer>
  );
}