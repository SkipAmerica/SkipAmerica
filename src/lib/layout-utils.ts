export const HEADER_HEIGHT = 48;
export const AD_PANEL_HEIGHT = 96;

export function getContentOffsets(showAdPanel: boolean) {
  const stickyElementsHeight = HEADER_HEIGHT + (showAdPanel ? AD_PANEL_HEIGHT : 0);
  
  return {
    notificationOffset: stickyElementsHeight,
    feedPaddingClass: showAdPanel ? 'pt-24 md:pt-36' : 'pt-12',
    // When AdPanel OFF: Row 2 is sticky, content only accounts for toggle
    // When AdPanel ON: Content accounts for header + toggle + AdPanel
    contentMarginClass: showAdPanel ? '-mt-24 md:-mt-36' : '-mt-12',
  };
}

/**
 * Calculate the offset for pull-to-refresh reveal area
 * This determines how far down the logo should appear to avoid sticky headers
 */
export function getPullToRefreshOffset(
  showAdPanel: boolean,
  hasNotificationZone: boolean
): number {
  const safeAreaTop = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--debug-safe-top') || '0'
  )
  
  // Vertical stack (top to bottom):
  // 1. Safe area (e.g., 48px on iPhone 14 Pro)
  // 2. IOSInstagramHeader (48px)
  // 3. Discovery Mode Toggle (48px)
  // 4. AdPanel (96px, if enabled)
  // 5. [PULL-TO-REFRESH AREA - 40px] ← Only visible during pull
  // 6. NotificationZone (variable height, if present)
  // 7. ThreadsFeed content
  
  let offset = safeAreaTop + HEADER_HEIGHT + HEADER_HEIGHT
  
  if (showAdPanel) {
    offset += AD_PANEL_HEIGHT
  }
  
  // Center the logo within the 40px reveal area
  offset -= 20 // Half of 40px to vertically center
  
  return offset
}
