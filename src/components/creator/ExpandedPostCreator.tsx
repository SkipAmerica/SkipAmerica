import { useState, useRef, useEffect } from 'react'
import { Plus, BarChart3, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/components/ui/button'
import { IOSModal } from '@/components/mobile/IOSModal'
import { useAuth } from '@/app/providers/auth-provider'
import { ensureSkipNativeAccount, uploadPostMedia, createPostRecord } from '@/lib/post-utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [isOpen])


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

  return (
    <IOSModal
      open={isOpen}
      onOpenChange={onClose}
      title="Create Post"
      size="full"
      showCloseButton={true}
      className={cn("md:max-w-2xl", className)}
    >
      {/* Content Area */}
      <div className="flex flex-col gap-4">
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleTextareaChange}
          placeholder={initialPrompt || "What's on your mind?"}
          className="w-full min-h-[120px] p-4 bg-muted/50 rounded-xl border border-transparent hover:border-border focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground text-foreground resize-none"
          rows={4}
        />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={handleFileChange}
        />

        {/* Media Preview Area */}
        {file && (
          <div className="min-h-[100px] bg-muted/30 rounded-xl p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
              className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
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
            disabled={loading || (!inputValue.trim() && !file)}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>
    </IOSModal>
  )
}
