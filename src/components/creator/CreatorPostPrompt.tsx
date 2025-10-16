import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ExpandedPostCreator } from './ExpandedPostCreator'

interface CreatorPostPromptProps {
  className?: string
  isVisible?: boolean
}

const prompts = [
  "What's one thing you wish more people understood?",
  "Say something your followers don't see on IG.",
  "What's something you'd tell someone in a 1-on-1?",
  "whats new?"
]

export const CreatorPostPrompt = ({ className, isVisible = true }: CreatorPostPromptProps) => {
  const [currentPrompt, setCurrentPrompt] = useState(() => {
    // Select a random prompt on component mount
    const randomIndex = Math.floor(Math.random() * prompts.length)
    return prompts[randomIndex]
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const openLockRef = useRef(false)

  const handleCircleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (openLockRef.current) return
    openLockRef.current = true
    setIsExpanded(true)
    setTimeout(() => { openLockRef.current = false }, 350)
  }

  const handleExpandedClose = () => {
    setIsExpanded(false)
    // Rotate to next prompt
    const randomIndex = Math.floor(Math.random() * prompts.length)
    setCurrentPrompt(prompts[randomIndex])
  }

  if (!isVisible) {
    return null
  }

  return (
    <>
      {/* Button Container */}
      <div 
        className="fixed left-4 z-[70] flex flex-col gap-4 transition-all duration-300 ease-in-out pointer-events-none"
        style={{
          bottom: `calc(var(--ios-tab-bar-height) + env(safe-area-inset-bottom) + 12px + (var(--lsb-visible,0) * (var(--lsb-height,72px) + 50px)))`,
          transition: 'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Post Button */}
        <button
          onClick={handleCircleClick}
          className={cn(
            "w-[50px] h-[50px] bg-white rounded-full shadow-2xl pointer-events-auto",
            "flex items-center justify-center",
            "transition-all duration-300 ease-in-out",
            "hover:scale-105 active:scale-95",
            className
          )}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 8px 12px -2px rgba(0, 0, 0, 0.3)',
          }}
          aria-label="Create post"
        >
          <Plus className="w-6 h-6 text-cyan-500" />
        </button>
      </div>

      {/* Expanded Post Creator */}
      <ExpandedPostCreator
        isOpen={isExpanded}
        onClose={handleExpandedClose}
        initialPrompt={currentPrompt}
        initialValue=""
      />
    </>
  )
}