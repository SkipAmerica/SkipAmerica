import { useState, useEffect } from 'react'
import { Plus, BarChart3 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

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
  const [currentPrompt, setCurrentPrompt] = useState('')

  useEffect(() => {
    // Select a random prompt on component mount
    const randomIndex = Math.floor(Math.random() * prompts.length)
    setCurrentPrompt(prompts[randomIndex])
  }, [])

  const handlePromptClick = () => {
    console.log('Creator wants to post:', currentPrompt)
    // TODO: Navigate to post creation or open post modal
  }

  const handleMediaUpload = () => {
    console.log('Creator wants to upload media')
    // TODO: Open media picker
  }

  const handleCreatePoll = () => {
    console.log('Creator wants to create poll')
    // TODO: Open poll creator
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={cn(
      "fixed bottom-[calc(49px+env(safe-area-inset-bottom))] left-0 right-0 z-40 transition-all duration-300 ease-in-out",
      "px-4 pb-2",
      className
    )}>
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 p-3">
          {/* Text Input Area */}
          <button
            onClick={handlePromptClick}
            className="flex-1 text-left px-4 py-3 text-muted-foreground bg-muted/50 rounded-xl border border-transparent hover:border-border transition-colors"
          >
            {currentPrompt}
          </button>
          
          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMediaUpload}
              className="p-2 rounded-full bg-background hover:bg-muted/50 transition-colors"
              aria-label="Upload photo or video"
            >
              <Plus className="w-5 h-5 text-turquoise" />
            </button>
            
            <button
              onClick={handleCreatePoll}
              className="p-2 rounded-full bg-background hover:bg-muted/50 transition-colors"
              aria-label="Create poll"
            >
              <BarChart3 className="w-4 h-4 text-turquoise" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}