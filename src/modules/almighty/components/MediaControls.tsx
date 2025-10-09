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
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-[45]">
      {/* Mic Toggle */}
      <Button 
        variant="secondary" 
        size="icon" 
        className="w-14 h-14 rounded-full bg-black/60 hover:bg-black/70" 
        onClick={onToggleMic}
      >
        {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>
      
      {/* Camera Toggle */}
      <Button 
        variant="secondary" 
        size="icon" 
        className="w-14 h-14 rounded-full bg-black/60 hover:bg-black/70" 
        onClick={onToggleCam}
      >
        {camEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>
      
      {/* Flip Camera (mobile only, with spinner) */}
      {canFlipCamera && (
        <Button
          variant="secondary"
          size="icon"
          className="w-14 h-14 rounded-full bg-black/60 hover:bg-black/70"
          onClick={onFlipCamera}
          disabled={!camEnabled || isFlippingCamera}
        >
          {isFlippingCamera ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SwitchCamera className="h-5 w-5" />
          )}
        </Button>
      )}
      
      {/* Audio Output (desktop only) */}
      {audioOutputDevices && audioOutputDevices.length > 1 && (
        <DropdownMenu open={showAudioMenu} onOpenChange={setShowAudioMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="w-14 h-14 rounded-full bg-black/60 hover:bg-black/70">
              <Speaker className="h-5 w-5" />
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
