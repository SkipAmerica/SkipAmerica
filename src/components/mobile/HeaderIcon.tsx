import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderIconProps {
  icon: React.ReactNode;
  tone: 'queue' | 'calendar' | 'message';
  count?: number;
  priority?: boolean;
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const HeaderIcon = React.memo(function HeaderIcon({
  icon,
  tone,
  count = 0,
  priority = false,
  ariaLabel,
  onClick,
  disabled = false,
}: HeaderIconProps) {
  const showBadge = count > 0;
  const showPriorityDot = priority && !showBadge && tone === 'message';
  const displayCount = count > 9 ? '9+' : count.toString();

  const badgeColorClass = {
    queue: 'bg-[--danger-600]',
    calendar: 'bg-[--amber-600]',
    message: 'bg-[--success-700]',
  }[tone];

  return (
    <Button
      variant="ghost"
      className={cn(
        "relative grid place-items-center",
        "w-10 h-10 rounded-lg p-0",
        "transition-colors duration-150",
        "[&_svg]:w-6 [&_svg]:h-6 [&_svg]:text-[--ink-900]",
        "disabled:[&_svg]:text-[--ink-500]",
        "hover:bg-muted/50"
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {icon}
      
      {/* Numeric Badge */}
      {showBadge && (
        <span
          className={cn(
            "absolute top-0 right-0 z-[2]",
            "transform translate-x-1/2 -translate-y-1/2",
            "min-w-4 h-4 px-1",
            "rounded-full border-2 border-white",
            "text-white text-xs leading-3 font-semibold",
            "grid place-items-center",
            "transition-all duration-[120ms] ease-out",
            "animate-in fade-in zoom-in-90",
            badgeColorClass
          )}
          data-count={count}
        >
          {displayCount}
        </span>
      )}

      {/* Priority Dot */}
      {showPriorityDot && (
        <span
          className={cn(
            "absolute right-[3px] bottom-[3px] z-[1]",
            "w-2 h-2 rounded-full",
            "bg-[--success-700] border-2 border-white"
          )}
          aria-label="Priority"
        />
      )}
    </Button>
  );
});
