// UI-specific types and common component props
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface NavigationProps extends BaseComponentProps {
  onBack?: () => void
}

export interface PageProps extends NavigationProps {
  title?: string
  loading?: boolean
  error?: string | null
}

export interface ListProps<T> extends BaseComponentProps {
  items: T[]
  loading?: boolean
  error?: string | null
  onItemSelect?: (item: T) => void
  renderItem?: (item: T) => React.ReactNode
}

export interface SearchProps extends BaseComponentProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSearch?: (query: string) => void
}

export interface FilterProps<T = string> extends BaseComponentProps {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
}

// Form-related types
export interface FormFieldProps extends BaseComponentProps {
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
}

// Loading and error states
export interface LoadingState {
  loading: boolean
  error?: string | null
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

// Common action types
export type ActionState<T = void> = LoadingState & {
  execute: (data: T) => Promise<void>
  reset: () => void
}