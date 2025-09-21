import { useState, useRef, useEffect } from 'react'
import { X, Plus, BarChart3, Image, Camera } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/components/ui/button'
import { useOnClickOutside } from '@/shared/hooks/use-on-click-outside'

interface ExpandedPostCreatorProps {
  isOpen: boolean
  onClose: () => void
  initialPrompt?: string
  initialValue?: string
  className?: string
}

export const ExpandedPostCreator = ({ 
  isOpen, 
  onClose, 
  initialPrompt = '', 
  initialValue = '',
  className 
}: ExpandedPostCreatorProps) => {
  const [inputValue, setInputValue] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useOnClickOutside<HTMLDivElement>((e) => {
    // Don't close if clicking on the textarea or action buttons
    if (textareaRef.current?.contains(e.target as Node)) {
      return
    }
    onClose()
  })

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [isOpen])

  useEffect(() => {
    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handlePost = () => {
    if (inputValue.trim()) {
      console.log('Posting:', inputValue)
      // TODO: Handle actual posting
      setInputValue('')
      onClose()
    }
  }

  const handleMediaUpload = () => {
    console.log('Media upload requested')
    // TODO: Handle media upload
  }

  const handleCreatePoll = () => {
    console.log('Poll creation requested')
    // TODO: Handle poll creation
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />
      
      {/* Expanded Creator */}
      <div 
        ref={containerRef}
        className={cn(
          "fixed inset-x-4 z-50 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl animate-slide-up",
          "top-[var(--ios-nav-bar-height,68px)] bottom-[calc(var(--ios-tab-bar-height,69px)+env(safe-area-inset-bottom))]",
          className
        )}
        style={{
          top: 'calc(var(--ios-nav-bar-height, 68px) + 12px)',
          bottom: 'calc(var(--ios-tab-bar-height, 69px) + env(safe-area-inset-bottom) + 12px)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Create Post</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            placeholder={initialPrompt || "What's on your mind?"}
            className="w-full min-h-[120px] p-4 bg-muted/50 rounded-xl border border-transparent hover:border-border focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground text-foreground resize-none"
            rows={4}
          />

          {/* Media Preview Area */}
          <div className="hidden min-h-[200px] bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Add photos or videos</p>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          {/* Media Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMediaUpload}
              className="flex items-center gap-2 text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Media</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreatePoll}
              className="flex items-center gap-2 text-primary hover:bg-primary/10"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Poll</span>
            </Button>
          </div>

          {/* Post Button */}
          <Button
            onClick={handlePost}
            disabled={!inputValue.trim()}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post
          </Button>
        </div>
      </div>
    </>
  )
}