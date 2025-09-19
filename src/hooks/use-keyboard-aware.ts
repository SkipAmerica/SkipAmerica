import { useState, useEffect } from 'react';

interface KeyboardState {
  isVisible: boolean;
  height: number;
}

export function useKeyboardAware() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0
  });
  const [initialViewportHeight, setInitialViewportHeight] = useState(0);

  useEffect(() => {
    // Store initial viewport height on mount
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    setInitialViewportHeight(viewportHeight);

    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = viewportHeight - currentHeight;
      
      // Keyboard is considered visible if viewport shrunk by more than 150px
      const isKeyboardVisible = heightDifference > 150;
      const keyboardHeight = isKeyboardVisible ? heightDifference : 0;

      setKeyboardState({
        isVisible: isKeyboardVisible,
        height: keyboardHeight
      });
    };

    // Use visualViewport API if available (iOS Safari)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    } else {
      // Fallback for other browsers
      window.addEventListener('resize', handleViewportChange);
      
      return () => {
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  // Calculate keyboard-aware safe area
  const getKeyboardAwareSafeTop = () => {
    return 'var(--safe-area-top)';
  };

  return {
    isKeyboardVisible: keyboardState.isVisible,
    keyboardHeight: keyboardState.height,
    getKeyboardAwareSafeTop,
    keyboardState
  };
}