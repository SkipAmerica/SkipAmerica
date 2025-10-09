import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function RightPane() {
  const [mode, setMode] = useState<'collaborators' | 'group'>('collaborators')

  const mockRoster = [
    { name: 'Alice', role: 'Creator' },
    { name: 'Bob', role: 'Moderator' },
    { name: 'Charlie', role: 'User' },
    { name: 'Diana', role: 'User' }
  ]

  return (
    <div
      className="h-full overflow-auto bg-background"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="p-4 space-y-4">
        {/* Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'collaborators' ? 'default' : 'outline'}
            onClick={() => setMode('collaborators')}
            className="flex-1"
          >
            Collaborators
          </Button>
          <Button
            variant={mode === 'group' ? 'default' : 'outline'}
            onClick={() => setMode('group')}
            className="flex-1"
          >
            Group
          </Button>
        </div>

        {/* Roster */}
        <div className="space-y-2">
          {mockRoster.map((person, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">{person.name}</span>
              <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
                {person.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
