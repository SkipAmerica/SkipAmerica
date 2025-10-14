import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Mic, MicOff, Video, VideoOff, SwitchCamera, Speaker, Loader2, X } from 'lucide-react'

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
  onEndCall: () => void
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
  onEndCall,
}: MediaControlsProps) {
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  
  return (
    <div 
      className="flex items-center gap-3 z-[45] bg-[#00D1FF]/95 backdrop-blur-sm shadow-xl border border-white/20 rounded-full px-5 py-2.5"
      style={{ '--skip-cyan': '#00D1FF' } as React.CSSProperties}
    >
      {/* Mic Toggle */}
      <Button 
        variant="secondary" 
        size="icon" 
        className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200" 
        onClick={onToggleMic}
      >
        {micEnabled ? <Mic className="h-4 w-4 stroke-white" /> : <MicOff className="h-4 w-4 stroke-white" />}
      </Button>
      
      {/* Camera Toggle */}
      <Button 
        variant="secondary" 
        size="icon" 
        className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200" 
        onClick={onToggleCam}
      >
        {camEnabled ? <Video className="h-4 w-4 stroke-white" /> : <VideoOff className="h-4 w-4 stroke-white" />}
      </Button>
      
      {/* Flip Camera (mobile only, with spinner) */}
      {canFlipCamera && (
        <Button
          variant="secondary"
          size="icon"
          className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
          onClick={onFlipCamera}
          disabled={!camEnabled || isFlippingCamera}
        >
          {isFlippingCamera ? (
            <Loader2 className="h-4 w-4 animate-spin stroke-white" />
          ) : (
            <SwitchCamera className="h-4 w-4 stroke-white" />
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
              className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
            >
              <Speaker className="h-4 w-4 stroke-white" />
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
      
      {/* End Call Button */}
      <Button 
        variant="secondary" 
        size="icon" 
        className="w-12 h-12 rounded-full bg-red-500/90 hover:bg-red-600 text-white transition-all duration-200 shadow-lg" 
        onClick={onEndCall}
        aria-label="End call"
      >
        <X className="h-4 w-4 stroke-white" />
      </Button>
    </div>
  )
}
