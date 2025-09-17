import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface IOSListViewProps {
  children: React.ReactNode;
  className?: string;
}

export function IOSListView({ children, className }: IOSListViewProps) {
  return (
    <div className={cn("ios-list", className)}>
      {children}
    </div>
  );
}

interface IOSListSectionProps {
  header?: string;
  children: React.ReactNode;
  className?: string;
}

export function IOSListSection({ header, children, className }: IOSListSectionProps) {
  return (
    <div className={cn("ios-list-section", className)}>
      {header && (
        <div className="ios-list-header">
          {header}
        </div>
      )}
      <div className="mx-4">
        {children}
      </div>
    </div>
  );
}

interface IOSListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  avatar?: React.ReactNode;
  badge?: React.ReactNode;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
}

export function IOSListItem({ 
  children, 
  onClick, 
  chevron = false, 
  avatar,
  badge,
  subtitle,
  className,
  disabled = false
}: IOSListItemProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "ios-list-item",
        onClick && "ios-touchable cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Avatar */}
      {avatar && (
        <div className="mr-3 flex-shrink-0">
          {avatar}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-base font-normal text-foreground truncate">
              {children}
            </div>
            {subtitle && (
              <div className="text-sm text-muted-foreground truncate mt-1">
                {subtitle}
              </div>
            )}
          </div>
          
          {/* Badge */}
          {badge && (
            <div className="ml-2 flex-shrink-0">
              {badge}
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      {chevron && (
        <ChevronRight 
          size={16} 
          className="text-muted-foreground ml-2 flex-shrink-0" 
        />
      )}
    </Component>
  );
}