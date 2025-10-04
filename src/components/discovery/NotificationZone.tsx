import { ReactNode } from 'react'

interface NotificationZoneProps {
  children?: ReactNode
  hasVisibleNotifications: boolean
  stickyOffset?: number // Total height of sticky elements above (48px header + 96px AdPanel)
}

export function NotificationZone({ 
  children, 
  hasVisibleNotifications,
  stickyOffset = 144 
}: NotificationZoneProps) {
  if (import.meta.env.DEV) {
    console.log('[NotificationZone] Rendering:', {
      hasVisibleNotifications,
      hasChildren: !!children,
      childrenCount: Array.isArray(children) ? children.length : (children ? 1 : 0)
    });
  }

  if (!hasVisibleNotifications) {
    if (import.meta.env.DEV) console.log('[NotificationZone] Returning null: no visible notifications');
    return null;
  }

  if (!children) {
    if (import.meta.env.DEV) console.log('[NotificationZone] Returning null: no children');
    return null;
  }

  return (
    <div 
      className="w-full"
      style={{ paddingTop: `${stickyOffset}px` }}
    >
      <div className="px-4 py-4 space-y-4">
        {children}
      </div>
    </div>
  )
}
