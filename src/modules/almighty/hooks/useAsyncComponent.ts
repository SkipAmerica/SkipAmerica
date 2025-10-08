import { lazy, Suspense, ComponentType, createElement } from 'react'

export function useAsyncComponent(loader: () => Promise<{ default: React.FC }>): ComponentType {
  const Component = lazy(loader)

  const AsyncWrapper: React.FC = () => {
    return createElement(
      Suspense,
      { fallback: createElement('div', { className: 'p-4 text-muted-foreground text-sm' }, 'Loading...') },
      createElement(Component)
    )
  }

  return AsyncWrapper
}
