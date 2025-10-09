import { Input } from '@/components/ui/input'
import { Tabs } from '../components/Tabs'

export function LeftPane() {
  return (
    <div
      className="h-full overflow-auto bg-background"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="h-full grid" style={{ gridTemplateRows: '25% 75%' }}>
        {/* Top 25%: Invite Input */}
        <div className="p-4 border-b flex flex-col justify-center">
          <label className="text-sm font-medium mb-2">Invite Creator</label>
          <Input
            placeholder="@handle"
            className="text-base"
          />
        </div>

        {/* Bottom 75%: Plugin Tabs */}
        <div className="min-h-0 overflow-hidden">
          <Tabs />
        </div>
      </div>
    </div>
  )
}
