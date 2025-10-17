export const HEADER_HEIGHT = 48;
export const AD_PANEL_HEIGHT = 96;
export const HEADER_TOP_ROW_HEIGHT = 56; // Skip logo + icons
export const HEADER_BOTTOM_ROW_HEIGHT = 80; // "What's new" + OnlineCreatorStories
export const FULL_HEADER_HEIGHT = HEADER_TOP_ROW_HEIGHT + HEADER_BOTTOM_ROW_HEIGHT; // 136px

export function getContentOffsets(showAdPanel: boolean) {
  const stickyElementsHeight = HEADER_HEIGHT + (showAdPanel ? AD_PANEL_HEIGHT : 0);
  
  return {
    notificationOffset: stickyElementsHeight,
    feedPaddingClass: showAdPanel ? 'pt-24 md:pt-36' : 'pt-12',
    // When AdPanel is OFF, use negative margin equal to full header height
    // This allows OnlineCreatorStories to scroll completely flush with DiscoveryModeToggle
    contentMarginClass: showAdPanel ? '-mt-24 md:-mt-36' : '-mt-[136px]',
  };
}
