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
