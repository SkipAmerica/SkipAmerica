import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IOSNavBarProps {
  title?: string;
  leftButton?: {
    icon?: React.ComponentType<any>;
    text?: string;
    onClick?: () => void;
  };
  rightButton?: {
    icon?: React.ComponentType<any>;
    text?: string;
    onClick?: () => void;
  };
  large?: boolean;
  transparent?: boolean;
  className?: string;
}

export function IOSNavBar({ 
  title, 
  leftButton, 
  rightButton, 
  large = false,
  transparent = false,
  className 
}: IOSNavBarProps) {
  return (
    <div className={cn(
      "ios-nav-bar",
      "fixed top-0 left-0 right-0 z-40",
      "flex items-end",
      "px-4 pb-2",
      !transparent && "bg-background/95 backdrop-blur-md border-b border-border/50",
      className
    )}>
      <div className="flex items-center justify-between w-full h-11">
        {/* Left Button */}
        <div className="flex-1 flex justify-start">
          {leftButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={leftButton.onClick}
              className="ios-touchable h-11 px-2"
            >
              {leftButton.icon && <leftButton.icon size={18} />}
              {leftButton.text && (
                <span className="text-primary font-normal">{leftButton.text}</span>
              )}
            </Button>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 flex justify-center">
          {title && (
            <h1 className={cn(
              "font-semibold text-center truncate max-w-full",
              large ? "text-xl" : "text-lg"
            )}>
              {title}
            </h1>
          )}
        </div>

        {/* Right Button */}
        <div className="flex-1 flex justify-end">
          {rightButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={rightButton.onClick}
              className="ios-touchable h-11 px-2"
            >
              {rightButton.text && (
                <span className="text-primary font-normal">{rightButton.text}</span>
              )}
              {rightButton.icon && <rightButton.icon size={18} />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}