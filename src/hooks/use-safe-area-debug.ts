import { useEffect } from 'react';

interface SafeAreaConfig {
  top: string;
  bottom: string;
}

const IPHONE_CONFIGS: Record<string, SafeAreaConfig> = {
  '14pro': { top: '59px', bottom: '34px' },
  '15pro': { top: '59px', bottom: '34px' },
  '14': { top: '47px', bottom: '34px' },
  '15': { top: '50px', bottom: '34px' },
  'se': { top: '20px', bottom: '0px' },
  'mini': { top: '50px', bottom: '34px' }
};

export function useSafeAreaDebug() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugIphone = urlParams.get('debug-iphone');
    
    if (debugIphone && IPHONE_CONFIGS[debugIphone]) {
      const config = IPHONE_CONFIGS[debugIphone];
      
      // Override CSS custom properties for debug mode
      document.documentElement.style.setProperty('--debug-safe-top', config.top);
      document.documentElement.style.setProperty('--debug-safe-bottom', config.bottom);
      
      // Add debug indicator
      if (!document.querySelector('.debug-safe-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'debug-safe-indicator';
        indicator.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(255, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 9999;
          font-family: monospace;
        `;
        indicator.textContent = `Debug: iPhone ${debugIphone}`;
        document.body.appendChild(indicator);
      }
    } else {
      // Remove debug overrides
      document.documentElement.style.removeProperty('--debug-safe-top');
      document.documentElement.style.removeProperty('--debug-safe-bottom');
      
      // Remove debug indicator
      const indicator = document.querySelector('.debug-safe-indicator');
      if (indicator) {
        indicator.remove();
      }
    }
  }, []);
  
  // Return current safe area values for components to use
  const getComputedSafeArea = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: style.getPropertyValue('--debug-safe-top') || style.getPropertyValue('--safe-area-top'),
      bottom: style.getPropertyValue('--debug-safe-bottom') || style.getPropertyValue('--safe-area-bottom')
    };
  };
  
  return { getComputedSafeArea };
}