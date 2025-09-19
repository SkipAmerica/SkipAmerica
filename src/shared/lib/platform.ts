// Platform detection utilities
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
}

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent)
}

export const isWebBrowser = (): boolean => {
  return !isMobile()
}

export const hasVisualViewport = (): boolean => {
  return 'visualViewport' in window
}