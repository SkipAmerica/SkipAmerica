import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface CreatorOnlyToggleProps {
  userId: string
  initialValue: boolean
}

export function CreatorOnlyToggle({ userId, initialValue }: CreatorOnlyToggleProps) {
  const [creatorOnlyMode, setCreatorOnlyMode] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    
    const { error } = await supabase
      .from('profiles')
      .update({ creator_only_mode: checked })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update visibility setting",
        variant: "destructive"
      })
      return
    }

    setCreatorOnlyMode(checked)
    toast({
      title: "Success",
      description: checked 
        ? "Profile now visible only to creators" 
        : "Profile now visible to everyone"
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {creatorOnlyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          Profile Visibility
        </CardTitle>
        <CardDescription>
          Control who can discover and book sessions with you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="creator-only-mode" className="text-base">
              Creator-Only Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              {creatorOnlyMode 
                ? "Only creators can find and book with you" 
                : "Both users and creators can find and book with you"
              }
            </p>
          </div>
          <Switch
            id="creator-only-mode"
            checked={creatorOnlyMode}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  )
}