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

// Re-export presence hooks
export { useCreatorPresence } from './use-creator-presence'
export { usePresenceManager } from './use-presence-manager'

// Re-export notification hooks
export { useNotificationRegistry } from '../../hooks/useNotificationRegistry'

// Re-export Almighty session hooks
export { useAlmightySessionStart } from '../../hooks/useAlmightySessionStart'

// Re-export keyboard hooks
export { useKeyboardAware } from '../../hooks/use-keyboard-aware'