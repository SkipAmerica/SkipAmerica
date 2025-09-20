import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/shared/hooks/use-debounce';

interface SummaryResult {
  summary: string;
  loading: boolean;
  error: string | null;
}

export function useKeywordSummarizer(keywords: string[]) {
  const [result, setResult] = useState<SummaryResult>({
    summary: '',
    loading: false,
    error: null,
  });
  
  const debouncedKeywords = useDebounce(keywords, 800);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const summarizeKeywords = useCallback(async (keywordList: string[]) => {
    if (keywordList.length === 0) {
      setResult({ summary: '', loading: false, error: null });
      return;
    }

    if (keywordList.length === 1) {
      setResult({ 
        summary: `Searching for ${keywordList[0]}`, 
        loading: false, 
        error: null 
      });
      return;
    }

    // Check cache first
    const cacheKey = keywordList.sort().join('|');
    if (cacheRef.current.has(cacheKey)) {
      setResult({ 
        summary: cacheRef.current.get(cacheKey)!, 
        loading: false, 
        error: null 
      });
      return;
    }

    // Cancel previous request if it's still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('keyword-summarizer', {
        body: { keywords: keywordList }
      });

      if (error) {
        throw new Error(error.message);
      }

      const summary = data.summary || `${keywordList.length} keywords active`;
      
      // Cache the result
      cacheRef.current.set(cacheKey, summary);
      
      setResult({ 
        summary, 
        loading: false, 
        error: data.error || null 
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }

      console.error('Keyword summarization error:', error);
      
      // Fallback to keyword count
      const fallbackSummary = `${keywordList.length} keywords active`;
      setResult({ 
        summary: fallbackSummary, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, []);

  useEffect(() => {
    summarizeKeywords(debouncedKeywords);
  }, [debouncedKeywords, summarizeKeywords]);

  return result;
}