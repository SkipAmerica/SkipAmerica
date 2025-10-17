import { ReactNode } from 'react'

interface NotificationZoneProps {
  children?: ReactNode
  hasVisibleNotifications: boolean
  stickyOffset?: number // Dynamic: 48px (header) or 144px (header + AdPanel)
}

export function NotificationZone({ 
  children, 
  hasVisibleNotifications,
  stickyOffset = 48  // Default to header-only (safe fallback)
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
    <div className="w-full px-4 py-4 space-y-4">
      {children}
    </div>
  )
}
