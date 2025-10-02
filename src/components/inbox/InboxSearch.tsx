import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Plus } from 'lucide-react';
import { useInboxStore } from '@/stores/inbox-store';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SUGGESTED_TAGS = [
  'unread',
  'priority',
  'offers',
  'new',
  'urgent',
  'follow-up',
  'archived',
];

export function InboxSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchQuery, setSearchQuery, selectedTags, removeTag, addTag } = useInboxStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search query
  const debouncedQuery = useDebounce(localQuery, 250);

  // Filter suggestions based on input and already selected tags
  const filteredSuggestions = SUGGESTED_TAGS.filter(
    tag => 
      !selectedTags.includes(tag) && 
      tag.toLowerCase().includes(localQuery.toLowerCase())
  );

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

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      addTag(tag);
      setLocalQuery('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localQuery.trim()) {
      e.preventDefault();
      handleAddTag(localQuery.trim().toLowerCase());
    } else if (e.key === 'Backspace' && !localQuery && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div className="p-4 space-y-3 bg-white">
      {/* Search Input with Suggestions */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search or add tags..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          className={cn(
            'pl-10 pr-4 py-3 w-full',
            'bg-gray-50 border border-gray-200',
            'text-gray-900 placeholder:text-gray-400',
            'focus:bg-white focus:ring-2 focus:ring-primary/50',
            'rounded-xl transition-all'
          )}
        />
        
        {/* Tag Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20">
            {filteredSuggestions.map((tag) => (
              <button
                key={tag}
                onClick={() => handleAddTag(tag)}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-gray-400" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Tags (Chips) */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleRemoveTag(tag)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'bg-primary/10 border border-primary/20',
                'text-sm font-medium text-gray-900 hover:bg-primary/20',
                'transition-all duration-200'
              )}
            >
              {tag}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
