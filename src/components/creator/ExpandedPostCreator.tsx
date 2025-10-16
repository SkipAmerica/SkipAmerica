import { useState, useRef, useEffect } from 'react'
import { X, Image, BarChart3 } from 'lucide-react'
import { useAuth } from '@/app/providers/auth-provider'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DrawerContent, DrawerClose } from '@/components/ui/drawer'
import { cn } from '@/shared/lib/utils'
import { useKeyboardAware } from '@/hooks/use-keyboard-aware'
import { ensureSkipNativeAccount, uploadPostMedia, createPostRecord } from '@/lib/post-utils'
import { toast } from 'sonner'

interface ExpandedPostCreatorProps {
  onClose: () => void
  initialPrompt?: string
  initialValue?: string
  className?: string
}

export const ExpandedPostCreator = ({
  onClose,
  initialPrompt,
  initialValue = '',
  className,
}: ExpandedPostCreatorProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(initialValue)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const { isKeyboardVisible } = useKeyboardAware()

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handlePost = async () => {
    if (!user) {
      toast.error('You must be logged in to post')
      return
    }

    if (!inputValue.trim() && !file) {
      toast.error('Post content or media is required')
      return
    }

    setLoading(true)

    try {
      // 1. Ensure skip_native social account
      const socialAccountId = await ensureSkipNativeAccount(user.id)

      // 2. Upload media if present
      let mediaResult
      if (file) {
        mediaResult = await uploadPostMedia(file)
      }

      // 3. Determine content type
      const contentType = file 
        ? (file.type.startsWith('image/') ? 'image' : 'video')
        : 'text'

      // 4. Create post record
      await createPostRecord({
        social_account_id: socialAccountId,
        content_type: contentType,
        description: inputValue.trim() || null,
        media_url: mediaResult?.media_url || null,
        thumbnail_url: mediaResult?.thumbnail_url || null,
        provider: mediaResult?.provider || null,
        playback_id: mediaResult?.playback_id || null,
        duration_sec: mediaResult?.duration_sec || null,
        aspect_ratio: mediaResult?.aspect_ratio || null,
      })

      toast.success('Post created successfully!')

      // Reset form
      setInputValue('')
      setFile(null)
      onClose()
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post. Please try again.')
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
      toast.error('Please select an image or video file')
      return
    }

    if (isVideo && f.size > 500 * 1024 * 1024) {
      toast.error('Video file size must be under 500MB')
      return
    }

    setFile(f)
  }

  const handleCreatePoll = () => {
    toast.info('Poll creation coming soon!')
  }

  return (
    <DrawerContent 
      className={cn("rounded-none !inset-0 !mt-0 flex flex-col", className)}
      style={{
        paddingTop: 'var(--safe-area-top)',
        height: '100dvh',
        maxHeight: '100dvh',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <DrawerClose asChild>
          <button
            className="text-foreground hover:opacity-70 transition-opacity underline"
          >
            Cancel
          </button>
        </DrawerClose>
        <button
          onClick={handlePost}
          disabled={loading || (!inputValue.trim() && !file)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-semibold transition-opacity",
            "bg-cyan-500 text-white hover:bg-cyan-600",
            (loading || (!inputValue.trim() && !file)) && "opacity-50"
          )}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-0">
        <div className="flex gap-3">
          {/* User Avatar */}
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || undefined} />
            <AvatarFallback>
              {profile?.full_name?.[0] || user?.user_metadata?.full_name?.[0] || user?.email?.[0] || '?'}
            </AvatarFallback>
          </Avatar>

          {/* Textarea */}
          <div className="flex-1 flex flex-col min-h-0">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              placeholder={initialPrompt || "What's happening?"}
              autoFocus
              className={cn(
                "w-full resize-none bg-transparent border-none outline-none",
                "text-base placeholder:text-muted-foreground",
                "focus:ring-0 p-0"
              )}
              rows={3}
            />

            {/* Media Preview */}
            {file && (
              <div className="mt-4 relative">
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-full rounded-lg max-h-96 object-cover"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(file)}
                    className="w-full rounded-lg max-h-96"
                    controls
                  />
                )}
                <button
                  onClick={() => setFile(null)}
                  className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                  aria-label="Remove media"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="border-t bg-background"
        style={{
          paddingBottom: isKeyboardVisible 
            ? 'calc(12px + env(safe-area-inset-bottom))' 
            : 'calc(var(--ios-tab-bar-height) + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={handleMediaUpload}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors text-muted-foreground"
            aria-label="Add media"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            onClick={handleCreatePoll}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors text-muted-foreground"
            aria-label="Create poll"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </DrawerContent>
  )
}
