import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MatchSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MatchSearchBar({
  value,
  onChange,
  placeholder = "Find & Follow by Location, Interest, Name or Keyword",
  className
}: MatchSearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  // Parse initial value into keywords on mount
  useEffect(() => {
    if (value) {
      const initialKeywords = value.split(' ').filter(keyword => keyword.trim().length > 0);
      setKeywords(initialKeywords);
      setInputValue('');
    }
  }, []);

  // Update parent when keywords change
  useEffect(() => {
    const combinedValue = [...keywords, inputValue.trim()].filter(Boolean).join(' ');
    if (combinedValue !== value) {
      onChange(combinedValue);
    }
  }, [keywords, inputValue, onChange, value]);

  const handleInputChange = useCallback((newValue: string) => {
    // Check if space was pressed (new value ends with space and input didn't)
    if (newValue.endsWith(' ') && !inputValue.endsWith(' ')) {
      const newKeyword = inputValue.trim();
      if (newKeyword && !keywords.includes(newKeyword)) {
        setKeywords(prev => [...prev, newKeyword]);
        setInputValue('');
      }
      return;
    }
    
    setInputValue(newValue);
  }, [inputValue, keywords]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
      // Remove last keyword when backspace is pressed on empty input
      setKeywords(prev => prev.slice(0, -1));
    } else if (e.key === 'Enter' && inputValue.trim()) {
      // Add keyword on Enter
      const newKeyword = inputValue.trim();
      if (!keywords.includes(newKeyword)) {
        setKeywords(prev => [...prev, newKeyword]);
        setInputValue('');
      }
    }
  }, [inputValue, keywords]);

  const removeKeyword = useCallback((keywordToRemove: string) => {
    setKeywords(prev => prev.filter(keyword => keyword !== keywordToRemove));
  }, []);

  const clearAll = useCallback(() => {
    setKeywords([]);
    setInputValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={cn("bg-background border-b border-border", className)}>
      <div className="px-4 py-2">
        <div className="relative">
          {/* Keywords and Input Container */}
          <div className="min-h-[44px] bg-muted/50 px-3 py-2 flex items-center gap-2">
            <Search 
              size={16} 
              className="text-muted-foreground flex-shrink-0" 
            />
            
            {/* Scrollable Keywords Container */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-nowrap">
              {keywords.map((keyword, index) => (
                <Badge 
                  key={`${keyword}-${index}`}
                  variant="secondary" 
                  className="bg-[#F4FDFB] text-[#0099FF] hover:bg-[#F4FDFB]/80 flex items-center gap-1 px-2 py-1 flex-shrink-0 border border-[#0099FF]"
                >
                  <span className="text-sm whitespace-nowrap">{keyword}</span>
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 hover:bg-black/10 p-0.5 flex-shrink-0 text-[#0099FF]"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
            
            {/* Input field */}
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={keywords.length === 0 ? placeholder : ""}
              className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground flex-1 min-w-0"
            />
          </div>
          
          {/* Clear button */}
          {(keywords.length > 0 || inputValue) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAll}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 hover:bg-muted"
            >
              <X size={14} />
            </Button>
          )}
        </div>
        
        {/* Keywords count indicator */}
        {keywords.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} active
          </div>
        )}
      </div>
    </div>
  );
}