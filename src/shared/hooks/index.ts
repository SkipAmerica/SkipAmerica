// Re-export all shared hooks
export { useDebounce } from './use-debounce'
export { useLocalStorage } from './use-local-storage'
export { usePrevious } from './use-previous'
export { useAsyncAction } from './use-async-action'
export { usePagination } from './use-pagination'
export { useIntersectionObserver } from './use-intersection-observer'
export { useMediaQuery } from './use-media-query'
export { useOnClickOutside } from './use-on-click-outside'

// Re-export live hooks  
export { useLive, useLiveSession, useQueueManager } from '../../hooks/live'
export type { LiveState } from '../../hooks/live'

// Re-export universal chat hooks
export { useUniversalChat } from '../../hooks/useUniversalChat'
export { useExternalChatInput } from '../../hooks/useExternalChatInput'
export { useSmartScroll } from './use-smart-scroll'
export type { SmartScrollBehavior } from './use-smart-scroll'