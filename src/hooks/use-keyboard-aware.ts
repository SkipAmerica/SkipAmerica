import { useState, useEffect, useCallback, useMemo } from 'react';
import { isMobile, isIOS, isWebBrowser } from '@/shared/lib/platform';

interface KeyboardState {
  isVisible: boolean;
  height: number;
}

export const useKeyboardAware = () => {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0
  });

  // Debounce function to prevent excessive state updates
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Optimized keyboard detection - only on actual mobile devices
  useEffect(() => {
    if (isWebBrowser()) return; // Skip keyboard detection on web browsers

    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    let isKeyboardCurrentlyVisible = false;

    const handleKeyboardChange = debounce(() => {
      if (isIOS() && window.visualViewport) {
        // iOS with visualViewport support
        const currentHeight = window.visualViewport.height;
        const heightDiff = initialViewportHeight - currentHeight;
        const threshold = 150; // Minimum height difference to consider keyboard visible
        
        const newIsVisible = heightDiff > threshold;
        
        if (newIsVisible !== isKeyboardCurrentlyVisible) {
          isKeyboardCurrentlyVisible = newIsVisible;
          setKeyboardState({
            isVisible: newIsVisible,
            height: newIsVisible ? heightDiff : 0
          });
        }
      } else if (isMobile()) {
        // Android and other mobile devices
        const currentHeight = window.innerHeight;
        const heightDiff = initialViewportHeight - currentHeight;
        const threshold = 150;
        
        const newIsVisible = heightDiff > threshold;
        
        if (newIsVisible !== isKeyboardCurrentlyVisible) {
          isKeyboardCurrentlyVisible = newIsVisible;
          setKeyboardState({
            isVisible: newIsVisible,
            height: newIsVisible ? heightDiff : 0
          });
        }
      }
    }, 150); // Increased debounce for stability

    // Add event listeners with passive option for better performance
    if (isIOS() && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleKeyboardChange, { passive: true });
    } else if (isMobile()) {
      window.addEventListener('resize', handleKeyboardChange, { passive: true });
    }

    return () => {
      if (isIOS() && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleKeyboardChange);
      } else if (isMobile()) {
        window.removeEventListener('resize', handleKeyboardChange);
      }
    };
  }, [debounce]);

  // Memoized values for better performance
  const isKeyboardVisible = useMemo(() => {
    // Only return true for actual mobile devices
    return isMobile() && keyboardState.isVisible;
  }, [keyboardState.isVisible]);
  
  const keyboardHeight = useMemo(() => keyboardState.height, [keyboardState.height]);

  // Simplified safe area calculation
  const getKeyboardAwareSafeTop = useCallback(() => {
    return 'var(--safe-area-top)';
  }, []);

  return {
    isKeyboardVisible,
    keyboardHeight,
    getKeyboardAwareSafeTop,
    keyboardState,
    isMobile: isMobile(),
    isIOS: isIOS()
  };
};