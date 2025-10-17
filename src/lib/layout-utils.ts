export const HEADER_HEIGHT = 48;
export const AD_PANEL_HEIGHT = 96;

export function getContentOffsets(showAdPanel: boolean) {
  const stickyElementsHeight = HEADER_HEIGHT + (showAdPanel ? AD_PANEL_HEIGHT : 0);
  
  return {
    notificationOffset: stickyElementsHeight,
    feedPaddingClass: showAdPanel ? 'pt-24 md:pt-36' : 'pt-12',
    contentMarginClass: showAdPanel ? '-mt-24 md:-mt-36' : '-mt-12',
  };
}
