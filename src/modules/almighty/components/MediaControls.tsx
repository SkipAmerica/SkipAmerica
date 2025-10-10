import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Mic, MicOff, Video, VideoOff, SwitchCamera, Speaker, Loader2 } from 'lucide-react'

interface MediaControlsProps {
  micEnabled: boolean
  camEnabled: boolean
  canFlipCamera: boolean
  isFlippingCamera: boolean
  audioOutputDevices?: MediaDeviceInfo[]
  onToggleMic: () => void
  onToggleCam: () => void
  onFlipCamera: () => void
  onSwitchAudioOutput: (deviceId: string) => void
}

export function MediaControls({
  micEnabled,
  camEnabled,
  canFlipCamera,
  isFlippingCamera,
  audioOutputDevices,
  onToggleMic,
  onToggleCam,
  onFlipCamera,
  onSwitchAudioOutput,
}: MediaControlsProps) {
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  
  return (
    <div 
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[45] bg-[#00D1FF]/95 backdrop-blur-sm shadow-xl border border-white/20 rounded-full px-6 py-3"
      style={{ '--skip-cyan': '#00D1FF' } as React.CSSProperties}
    >
      {/* Mic Toggle */}
      <Button 
        variant="secondary" 
        size="icon" 
        className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200" 
        onClick={onToggleMic}
      >
        {micEnabled ? <Mic className="h-5 w-5 stroke-white" /> : <MicOff className="h-5 w-5 stroke-white" />}
      </Button>
      
      {/* Camera Toggle */}
      <Button 
        variant="secondary" 
        size="icon" 
        className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200" 
        onClick={onToggleCam}
      >
        {camEnabled ? <Video className="h-5 w-5 stroke-white" /> : <VideoOff className="h-5 w-5 stroke-white" />}
      </Button>
      
      {/* Flip Camera (mobile only, with spinner) */}
      {canFlipCamera && (
        <Button
          variant="secondary"
          size="icon"
          className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
          onClick={onFlipCamera}
          disabled={!camEnabled || isFlippingCamera}
        >
          {isFlippingCamera ? (
            <Loader2 className="h-5 w-5 animate-spin stroke-white" />
          ) : (
            <SwitchCamera className="h-5 w-5 stroke-white" />
          )}
        </Button>
      )}
      
      {/* Audio Output (desktop only) */}
      {audioOutputDevices && audioOutputDevices.length > 1 && (
        <DropdownMenu open={showAudioMenu} onOpenChange={setShowAudioMenu}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="secondary" 
              size="icon" 
              className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
            >
              <Speaker className="h-5 w-5 stroke-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {audioOutputDevices.map(device => (
              <DropdownMenuItem key={device.deviceId} onClick={() => onSwitchAudioOutput(device.deviceId)}>
                {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
