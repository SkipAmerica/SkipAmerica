import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLive } from '@/app/providers/live-provider'
import { LiveSessionModal } from '@/components/live/LiveSessionModal'

interface LiveStatusToggleProps {
  className?: string
}

export function LiveStatusToggle({ className }: LiveStatusToggleProps) {
  const [showModal, setShowModal] = useState(false)
  const { isLive, goLive, endLive } = useLive()

  const handleToggle = async () => {
    if (isLive) {
      await endLive()
    } else {
      await goLive()
      setShowModal(true)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
  }

  return (
    <>
      <Button
        onClick={handleToggle}
        variant={isLive ? "destructive" : "default"}
        className={className}
      >
        {isLive ? "End Live" : "Go Live"}
      </Button>
      
      <LiveSessionModal 
        isOpen={showModal} 
        onClose={handleModalClose} 
      />
    </>
  )
}