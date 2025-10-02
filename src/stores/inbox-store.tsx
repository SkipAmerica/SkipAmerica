import { create } from 'zustand';

export interface InboxCounts {
  standard_unread: number;
  priority_unread: number;
  offers_new: number;
  requests_unread: number;
}

export type InboxTab = 'offers' | 'priority' | 'standard' | 'requests';

interface ScrollPosition {
  [key: string]: number;
}

interface InboxState {
  counts: InboxCounts;
  activeTab: InboxTab;
  searchQuery: string;
  selectedTags: string[];
  scrollPositions: ScrollPosition;
  
  // Actions
  setCounts: (counts: InboxCounts) => void;
  setActiveTab: (tab: InboxTab) => void;
  setSearchQuery: (query: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  clearTags: () => void;
  saveScrollPosition: (tab: InboxTab, position: number) => void;
  getScrollPosition: (tab: InboxTab) => number;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  counts: {
    standard_unread: 0,
    priority_unread: 0,
    offers_new: 0,
    requests_unread: 0,
  },
  activeTab: 'standard',
  searchQuery: '',
  selectedTags: [],
  scrollPositions: {},

  setCounts: (counts) => set({ counts }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  addTag: (tag) => set((state) => ({ 
    selectedTags: [...state.selectedTags, tag] 
  })),
  removeTag: (tag) => set((state) => ({ 
    selectedTags: state.selectedTags.filter(t => t !== tag) 
  })),
  clearTags: () => set({ selectedTags: [] }),
  saveScrollPosition: (tab, position) => set((state) => ({
    scrollPositions: { ...state.scrollPositions, [tab]: position }
  })),
  getScrollPosition: (tab) => get().scrollPositions[tab] || 0,
}));
