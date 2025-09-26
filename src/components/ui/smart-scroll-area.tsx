import React from 'react'
import { ScrollArea } from './scroll-area'
import { useSmartScroll, SmartScrollBehavior } from '@/shared/hooks/use-smart-scroll'

interface SmartScrollAreaProps {
  children: React.ReactNode
  items: any[]
  scrollBehavior?: SmartScrollBehavior
  onNewItems?: () => void
  className?: string
}

export function SmartScrollArea({ 
  children, 
  items, 
  scrollBehavior = { autoOnNew: true, threshold: 100, messageFlow: 'newest-bottom' },
  onNewItems,
  className 
}: SmartScrollAreaProps) {
  const { sentinelRef, scrollToNewest, scrollToTop, isAtNewest } = useSmartScroll({
    items,
    scrollBehavior,
    onNewItems
  })

  const { messageFlow = 'newest-bottom' } = scrollBehavior

  return (
    <ScrollArea className={className}>
      {messageFlow === 'newest-top' && (
        <div 
          ref={sentinelRef} 
          className="h-px w-full pointer-events-none" 
          aria-hidden="true"
        />
      )}
      
      {children}
      
      {messageFlow === 'newest-bottom' && (
        <div 
          ref={sentinelRef} 
          className="h-px w-full pointer-events-none" 
          aria-hidden="true"
        />
      )}
    </ScrollArea>
  )
}