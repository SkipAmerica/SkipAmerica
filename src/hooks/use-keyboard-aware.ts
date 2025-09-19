import { useState, useEffect, useRef } from 'react';

interface KeyboardState {
  isVisible: boolean;
  height: number;
}

// Platform detection
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export function useKeyboardAware() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0
  });
  const [initialViewportHeight, setInitialViewportHeight] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout>();
  const platform = {
    isMobile: isMobile(),
    isIOS: isIOS(),
    isWeb: !isMobile()
  };

  useEffect(() => {
    // Only apply keyboard detection on mobile platforms
    if (platform.isWeb) {
      return;
    }

    // Store initial viewport height on mount
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    setInitialViewportHeight(viewportHeight);

    const handleViewportChange = () => {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce viewport changes to prevent rapid switching
      debounceRef.current = setTimeout(() => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDifference = viewportHeight - currentHeight;
        
        // Keyboard is considered visible if viewport shrunk by more than 150px
        // and we're on a mobile device
        const isKeyboardVisible = heightDifference > 150 && platform.isMobile;
        const keyboardHeight = isKeyboardVisible ? heightDifference : 0;

        setKeyboardState({
          isVisible: isKeyboardVisible,
          height: keyboardHeight
        });
      }, 100); // 100ms debounce
    };

    // Use visualViewport API if available (iOS Safari)
    if (window.visualViewport && platform.isIOS) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    } else if (platform.isMobile) {
      // Fallback for Android and other mobile browsers
      window.addEventListener('resize', handleViewportChange);
      
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }, [platform.isMobile, platform.isIOS, platform.isWeb]);

  // Calculate keyboard-aware safe area
  const getKeyboardAwareSafeTop = () => {
    // Always respect the safe area - let CSS handle positioning
    return 'var(--safe-area-top)';
  };

  return {
    isKeyboardVisible: keyboardState.isVisible,
    keyboardHeight: keyboardState.height,
    getKeyboardAwareSafeTop,
    keyboardState
  };
}