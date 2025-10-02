import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useInboxStore } from '@/stores/inbox-store';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function InboxSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchQuery, setSearchQuery, selectedTags, removeTag } = useInboxStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  
  // Debounce search query
  const debouncedQuery = useDebounce(localQuery, 250);

  // Update store and URL when debounced query changes
  useEffect(() => {
    setSearchQuery(debouncedQuery);
    
    const newParams = new URLSearchParams(searchParams);
    if (debouncedQuery) {
      newParams.set('q', debouncedQuery);
    } else {
      newParams.delete('q');
    }
    navigate(`/inbox?${newParams.toString()}`, { replace: true });
  }, [debouncedQuery, setSearchQuery, navigate, searchParams]);

  // Update URL when tags change
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedTags.length > 0) {
      newParams.set('tags', selectedTags.join(','));
    } else {
      newParams.delete('tags');
    }
    navigate(`/inbox?${newParams.toString()}`, { replace: true });
  }, [selectedTags, navigate, searchParams]);

  const handleRemoveTag = (tag: string) => {
    removeTag(tag);
  };

  return (
    <div className="p-4 space-y-3 border-b border-border/50">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, @handle, or keywords..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className={cn(
            'pl-10 pr-4 py-3 w-full',
            'bg-muted/50 backdrop-blur-xl border border-border/50',
            'text-foreground placeholder:text-muted-foreground',
            'focus:bg-muted focus:ring-1 focus:ring-ring',
            'rounded-xl transition-all'
          )}
        />
      </div>

      {/* Selected Tags (Chips) */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleRemoveTag(tag)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                'bg-primary/20 border border-primary/30',
                'text-sm text-foreground hover:bg-primary/30',
                'transition-all duration-200'
              )}
            >
              {tag}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
