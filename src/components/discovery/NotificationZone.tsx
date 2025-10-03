import { ReactNode } from 'react'

interface NotificationZoneProps {
  children?: ReactNode
  stickyOffset?: number // Total height of sticky elements above (48px header + 96px AdPanel)
}

export function NotificationZone({ 
  children, 
  stickyOffset = 144 
}: NotificationZoneProps) {
  if (!children) {
    return null;
  }

  return (
    <div 
      className="w-full"
      style={{ paddingTop: `${stickyOffset}px` }}
    >
      <div className="px-4 pb-3 space-y-4">
        {children}
      </div>
    </div>
  )
}
