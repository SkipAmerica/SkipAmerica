import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IOSModalProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
}

export function IOSModal({ 
  trigger, 
  title, 
  description, 
  children, 
  open, 
  onOpenChange,
  size = 'md',
  showCloseButton = true
}: IOSModalProps) {
  const sizeClasses = {
    sm: 'max-w-[min(24rem,90vw)]',
    md: 'max-w-[min(28rem,90vw)]',
    lg: 'max-w-[min(42rem,90vw)]',
    full: 'max-w-[90vw] max-h-[90vh]'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent 
        className={cn(
          "bg-white/10 backdrop-blur-lg border-white/30",
          "dark:bg-black/40 dark:border-white/20",
          "rounded-2xl",
          "p-0 gap-0",
          "overflow-hidden",
          "animate-scale-in",
          sizeClasses[size]
        )}
      >
        {/* Header */}
        {(title || description) && (
          <DialogHeader className={cn(
            "p-6 pb-4",
            "relative text-center",
            "border-b border-border/50"
          )}>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange?.(false)}
                className="absolute right-4 top-4 h-8 w-8 rounded-full"
              >
                <X size={16} />
              </Button>
            )}
            
            {title && (
              <DialogTitle className="text-xl font-semibold pr-12">
                {title}
              </DialogTitle>
            )}
            
            {description && (
              <DialogDescription className="text-muted-foreground mt-2">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}

        {/* Content */}
        <div className={cn(
          "px-[5%] py-6",
          size === 'full' && "overflow-y-auto"
        )}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}