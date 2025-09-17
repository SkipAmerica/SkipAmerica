import React from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface IOSSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  className?: string;
}

export function IOSSearchBar({
  value,
  onChange,
  placeholder = "Search",
  onFocus,
  onBlur,
  onCancel,
  showCancel = false,
  className
}: IOSSearchBarProps) {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex-1">
        <Search 
          size={16} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            "ios-button",
            "pl-10 pr-10",
            "bg-muted/50 border-0",
            "rounded-lg",
            "text-base",
            "focus-visible:ring-0",
            "placeholder:text-muted-foreground"
          )}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
          >
            <X size={14} />
          </Button>
        )}
      </div>
      
      {showCancel && (
        <Button
          variant="ghost"
          onClick={onCancel}
          className="ios-touchable text-primary font-normal px-0"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}