import { useRef, useState, useEffect } from 'react';
import { getFilterProcessor, type FilterPreset } from '@/lib/advancedFilterProcessor';

export interface BroadcastFiltersAPI {
  isReady: boolean;
  currentFilter: FilterPreset;
  applyFilter: (filter: FilterPreset, sourceStream: MediaStream) => Promise<MediaStream>;
  removeFilter: (sourceStream: MediaStream) => Promise<MediaStream>;
  setFilter: (filter: FilterPreset) => void;
  // setEyeEnhance: (enabled: boolean) => void;
  // setTeethWhiten: (enabled: boolean) => void;
}

/**
 * Manages filter processor lifecycle independently from stream lifecycle.
 * Prevents effect loops by using imperative control flow.
 */
export function useBroadcastFilters(): BroadcastFiltersAPI {
  const processorRef = useRef(getFilterProcessor());
  const [isReady, setIsReady] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterPreset>('none');

  // Initialize processor once on mount
  useEffect(() => {
    const processor = processorRef.current;
    let mounted = true;

    processor.initialize()
      .then(() => {
        if (mounted) {
          console.log('[BroadcastFilters] Processor initialized');
          setIsReady(true);
        }
      })
      .catch((error) => {
        console.error('[BroadcastFilters] Initialization failed:', error);
        if (mounted) {
          setIsReady(true); // Continue without filters
        }
      });

    return () => {
      mounted = false;
      processor.stop();
    };
  }, []); // Only run once

  const applyFilter = async (filter: FilterPreset, sourceStream: MediaStream): Promise<MediaStream> => {
    if (!isReady) {
      console.warn('[BroadcastFilters] Processor not ready, returning original stream');
      return sourceStream;
    }

    if (filter === 'none') {
      return sourceStream;
    }

    const processor = processorRef.current;
    processor.setFilter(filter);
    const filtered = await processor.start(sourceStream);
    setCurrentFilter(filter);
    console.log('[BroadcastFilters] Filter applied:', filter);
    return filtered;
  };

  const removeFilter = async (sourceStream: MediaStream): Promise<MediaStream> => {
    const processor = processorRef.current;
    processor.stop();
    setCurrentFilter('none');
    console.log('[BroadcastFilters] Filter removed');
    return sourceStream;
  };

  const setFilterImperative = (filter: FilterPreset) => {
    if (isReady && currentFilter !== filter) {
      processorRef.current.setFilter(filter);
      setCurrentFilter(filter);
      console.log('[BroadcastFilters] Filter updated:', filter);
    }
  };

  // Eye/teeth enhancement disabled
  /*
  const setEyeEnhance = (enabled: boolean) => {
    if (processorRef.current) {
      processorRef.current.setEyeEnhance(enabled);
    }
  };

  const setTeethWhiten = (enabled: boolean) => {
    if (processorRef.current) {
      processorRef.current.setTeethWhiten(enabled);
    }
  };
  */

  return {
    isReady,
    currentFilter,
    applyFilter,
    removeFilter,
    setFilter: setFilterImperative,
    // setEyeEnhance,
    // setTeethWhiten
  };
}
