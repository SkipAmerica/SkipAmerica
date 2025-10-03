import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { cn } from '@/lib/utils';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  onStatusChange?: (status: UsernameStatus) => void;
}

export function UsernameInput({ value, onChange, onStatusChange }: UsernameInputProps) {
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [suggestion, setSuggestion] = useState<string>('');
  const debouncedUsername = useDebounce(value, 500);

  useEffect(() => {
    if (!debouncedUsername) {
      setStatus('idle');
      setMessage('');
      setSuggestion('');
      onStatusChange?.('idle');
      return;
    }

    checkAvailability(debouncedUsername);
  }, [debouncedUsername]);

  const checkAvailability = async (username: string) => {
    setStatus('checking');
    setMessage('');
    setSuggestion('');

    try {
      const { data, error } = await supabase.functions.invoke('check-username-availability', {
        body: { username }
      });

      if (error) {
        console.error('Error checking username:', error);
        setStatus('invalid');
        setMessage('Error checking availability');
        onStatusChange?.('invalid');
        return;
      }

      if (data.available) {
        setStatus('available');
        setMessage(data.message || 'Available');
        onStatusChange?.('available');
      } else {
        const newStatus = data.reason === 'reserved' ? 'reserved' : 
                         data.reason === 'invalid_format' ? 'invalid' : 'taken';
        setStatus(newStatus);
        setMessage(data.message || 'Not available');
        if (data.suggestion) {
          setSuggestion(data.suggestion);
        }
        onStatusChange?.(newStatus);
      }
    } catch (err) {
      console.error('Exception checking username:', err);
      setStatus('invalid');
      setMessage('Error checking availability');
      onStatusChange?.('invalid');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    onChange(newValue);
    if (newValue !== value) {
      setStatus('idle');
    }
  };

  const applySuggestion = () => {
    if (suggestion) {
      onChange(suggestion);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-white/60" />;
      case 'available':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'taken':
      case 'invalid':
        return <X className="h-4 w-4 text-red-500" />;
      case 'reserved':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'available':
        return 'text-green-500';
      case 'taken':
      case 'invalid':
        return 'text-red-500';
      case 'reserved':
        return 'text-yellow-500';
      default:
        return 'text-white/60';
    }
  };

  const characterCount = value.length;
  const isValidLength = characterCount >= 3 && characterCount <= 30;

  return (
    <div className="space-y-2">
      <Label htmlFor="username" className="text-base font-medium text-white">
        Username *
      </Label>
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 font-medium">
          @
        </div>
        <Input
          id="username"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="yourname"
          className="pl-8 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
          maxLength={30}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>

      <div className="flex items-start gap-2 min-h-[20px]">
        {status !== 'idle' && (
          <div className={cn("text-sm font-medium flex items-center gap-1.5", getStatusColor())}>
            {message}
          </div>
        )}
      </div>

      {suggestion && status === 'taken' && (
        <button
          type="button"
          onClick={applySuggestion}
          className="text-sm text-white/60 hover:text-white underline"
        >
          Try "{suggestion}" instead?
        </button>
      )}

      <div className="flex items-start gap-2 text-xs text-white/50">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>
          3-30 characters. Letters, numbers, and underscores only.
          <span className={cn(
            "ml-2 font-medium",
            isValidLength ? "text-white/60" : "text-red-400"
          )}>
            {characterCount}/30
          </span>
        </span>
      </div>
    </div>
  );
}
