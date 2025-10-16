import { useState, useRef, useEffect } from 'react'
import { ImagePlus, BarChart3, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useAuth } from '@/app/providers/auth-provider'
import { ensureSkipNativeAccount, uploadPostMedia, createPostRecord } from '@/lib/post-utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useKeyboardAware } from '@/hooks/use-keyboard-aware'

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
  const { user } = useAuth()
  const [inputValue, setInputValue] = useState(initialValue)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { isKeyboardVisible, keyboardHeight } = useKeyboardAware()

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen && !isVisible) {
      // Wait for slide-out animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300) // Match animation duration
      return () => clearTimeout(timer)
    }
  }, [isOpen, isVisible])

  useEffect(() => {
    if (isVisible && textareaRef.current) {
      // Delay focus until after the modal's slide-in animation completes (300ms)
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
      }, 350) // 350ms = 300ms animation + 50ms buffer
      
      return () => clearTimeout(timer)
    }
  }, [isVisible])


  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handlePost = async () => {
    if (!user) {
      toast.error('You must be signed in to post.')
      return
    }
    
    if (!inputValue.trim() && !file) {
      toast.error('Please add some content to your post.')
      return
    }

    setLoading(true)
    try {
      const social_account_id = await ensureSkipNativeAccount(user.id)

      let mediaRes: Awaited<ReturnType<typeof uploadPostMedia>> | undefined
      let content_type: 'text' | 'image' | 'video' = 'text'

      if (file) {
        content_type = file.type.startsWith('image/') ? 'image' : 'video'
        mediaRes = await uploadPostMedia(file, { pathPrefix: `users/${user.id}` })
      }

      const postId = await createPostRecord({
        social_account_id,
        content_type,
        title: null,
        description: inputValue || null,
        media_url: mediaRes?.media_url || null,
        thumbnail_url: mediaRes?.thumbnail_url || null,
        provider: mediaRes?.provider,
        playback_id: mediaRes?.playback_id || null,
        duration_sec: mediaRes?.duration_sec || null,
        aspect_ratio: mediaRes?.aspect_ratio || null,
      })

      // Hydrate the exact row we just created (with joins) for optimistic prepend
      const { data } = await supabase
        .from('creator_content')
        .select(`
          id,
          content_type,
          title,
          description,
          media_url,
          thumbnail_url,
          provider,
          playback_id,
          view_count,
          like_count,
          comment_count,
          published_at,
          created_at,
          social_accounts!inner (
            platform,
            profiles!inner (
              id,
              full_name,
              avatar_url,
              username
            )
          )
        `)
        .eq('id', postId)
        .single()

      // Call global callback for optimistic prepend
      if (data && (window as any).__feedPostCreated) {
        (window as any).__feedPostCreated(data)
      }

      toast.success('Posted!')
      setInputValue('')
      setFile(null)
      onClose()
    } catch (e: any) {
      console.error('Post error:', e)
      toast.error(e?.message || 'Failed to post')
    } finally {
      setLoading(false)
    }
  }

  const handleMediaUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    
    const isImage = f.type.startsWith('image/')
    const isVideo = f.type.startsWith('video/')
    
    if (!isImage && !isVideo) {
      toast.error('Unsupported file type. Please select an image or video.')
      return
    }
    
    if (isVideo && f.size > 1024 * 1024 * 500) {
      toast.error('Video too large (max 500MB)')
      return
    }
    
    setFile(f)
  }

  const handleCreatePoll = () => {
    console.log('Poll creation requested')
    // TODO: Handle poll creation
  }

  if (!shouldRender) return null

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[80] bg-background",
        "transform transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full",
        className
      )}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14">
        <button
          onClick={onClose}
          className="text-base font-normal text-foreground hover:opacity-70 transition-opacity"
        >
          Cancel
        </button>
        
        <button
          onClick={handlePost}
          disabled={loading || (!inputValue.trim() && !file)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-semibold transition-opacity",
            "bg-primary text-primary-foreground",
            (loading || (!inputValue.trim() && !file)) && "opacity-50"
          )}
        >
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>

      {/* Content Area - Full height flex container */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 pb-16">
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Avatar */}
          <Avatar className="w-11 h-11 flex-shrink-0">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || '?'}
            </AvatarFallback>
          </Avatar>

          {/* Input Column - fills remaining space */}
          <div className="flex-1 flex flex-col min-h-0">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              placeholder={initialPrompt || "What's happening?"}
              className="w-full flex-1 bg-transparent border-none focus:outline-none text-lg text-foreground placeholder:text-muted-foreground resize-none"
              onPointerDownCapture={(e) => e.stopPropagation()}
              onTouchStartCapture={(e) => e.stopPropagation()}
            />

            {/* Media Preview - stays at bottom of textarea area */}
            {file && (
              <div className="mt-3 bg-muted/30 rounded-2xl p-3 flex items-center gap-3 flex-shrink-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={handleFileChange}
      />

      {/* Bottom Toolbar - Keyboard aware */}
      <div 
        className="fixed bottom-0 left-0 right-0 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-1 bg-background z-[81] border-t border-border/10"
        style={{
          transform: isKeyboardVisible ? `translateY(-${keyboardHeight}px)` : 'translateY(0)',
        }}
      >
        <button
          onClick={handleMediaUpload}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors text-primary"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        
        <button
          onClick={handleCreatePoll}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors text-primary"
        >
          <BarChart3 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
