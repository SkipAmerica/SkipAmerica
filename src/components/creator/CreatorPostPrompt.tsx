import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useScrollDetection } from '@/hooks/use-scroll-detection'
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
  const { isScrolling } = useScrollDetection()

  // Calculate opacity based on scroll state
  const getOpacity = () => {
    if (isScrolling) return 0.25 // 75% transparent when scrolling
    return 1 // 100% opaque when still
  }

  const handleCircleClick = () => {
    setIsExpanded(true)
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
      {/* Circular Post Button */}
      <button
        onClick={handleCircleClick}
        className={cn(
          "fixed bottom-[calc(65px+env(safe-area-inset-bottom))] right-4 z-40",
          "w-15 h-15 bg-white rounded-full shadow-lg",
          "flex items-center justify-center",
          "transition-all duration-300 ease-in-out",
          "hover:scale-105 active:scale-95",
          className
        )}
        style={{
          opacity: getOpacity(),
        }}
        aria-label="Create post"
      >
        <Plus className="w-6 h-6 text-orange-500" />
      </button>

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