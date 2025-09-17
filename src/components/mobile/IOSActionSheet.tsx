import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface IOSActionSheetProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function IOSActionSheet({ 
  trigger, 
  title, 
  description, 
  children, 
  open, 
  onOpenChange 
}: IOSActionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
      )}
      <SheetContent 
        side="bottom" 
        className={cn(
          "ios-sheet",
          "max-h-[90vh] overflow-y-auto",
          "p-0",
          "focus:outline-none"
        )}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        {(title || description) && (
          <SheetHeader className="px-4 pb-4 text-center">
            {title && (
              <SheetTitle className="text-lg font-semibold">
                {title}
              </SheetTitle>
            )}
            {description && (
              <SheetDescription className="text-sm text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}

        {/* Content */}
        <div className="pb-safe-bottom">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface IOSActionSheetItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<any>;
}

export function IOSActionSheetItem({ 
  children, 
  onClick, 
  destructive = false, 
  disabled = false,
  icon: Icon 
}: IOSActionSheetItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "ios-list-item ios-touchable",
        "w-full text-left justify-start",
        "border-b border-border/50 last:border-b-0",
        "text-base font-normal",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        destructive && "text-destructive",
        !destructive && "text-foreground"
      )}
    >
      {Icon && (
        <Icon 
          size={20} 
          className={cn(
            "mr-3",
            destructive ? "text-destructive" : "text-muted-foreground"
          )} 
        />
      )}
      {children}
    </button>
  );
}