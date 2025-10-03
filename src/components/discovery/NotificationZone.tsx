import { ReactNode } from 'react'

interface NotificationZoneProps {
  children?: ReactNode
  stickyOffset?: number // Total height of sticky elements above (48px header + 96px AdPanel)
}

export function NotificationZone({ 
  children, 
  stickyOffset = 144 
}: NotificationZoneProps) {
  return (
    <div 
      className="w-full"
      style={{ paddingTop: `${stickyOffset + 20}px` }}
    >
      {children && (
        <div className="px-4 pb-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}
