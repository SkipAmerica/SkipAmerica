import { useState } from 'react'
import { cn } from '@/lib/utils'
import { pluginTabs } from '../plugins/registry'
import { useAsyncComponent } from '../hooks/useAsyncComponent'

export function Tabs() {
  const [activeId, setActiveId] = useState(pluginTabs[0].id)
  const activeTab = pluginTabs.find(t => t.id === activeId)!
  const ActiveTabContent = useAsyncComponent(activeTab.load)

  return (
    <div className="flex flex-col h-full">
      {/* Tab Pills */}
      <div className="flex gap-2 p-3 border-b overflow-x-auto">
        {pluginTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg whitespace-nowrap text-sm transition-colors',
              activeId === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-auto" style={{ touchAction: 'pan-y' }}>
        <ActiveTabContent />
      </div>
    </div>
  )
}
