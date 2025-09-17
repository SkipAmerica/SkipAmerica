import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { OrganizationJoinDialog } from "@/components/industry/OrganizationJoinDialog"
import { CreatorOnlyToggle } from "@/components/industry/CreatorOnlyToggle"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Briefcase, Building2 } from "lucide-react"

const IndustryResourceSetup = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [showOrgDialog, setShowOrgDialog] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [specialization, setSpecialization] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    fetchProfile()
  }, [user, navigate])

  const fetchProfile = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      })
      return
    }

    setProfile(data)
    setSpecialization(data.industry_specialization || "")
  }

  const handleUpdateProfile = async () => {
    if (!user || !specialization.trim()) return

    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ 
        industry_specialization: specialization.trim()
      })
      .eq('id', user.id)

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update specialization",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Profile updated successfully"
    })
    fetchProfile()
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <Briefcase className="h-6 w-6 text-primary mr-2" />
              <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">Skip</span>
            </Button>
            <div className="text-lg font-semibold">Industry Resource Setup</div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome, Industry Resource!</h1>
            <p className="text-muted-foreground mt-2">
              Complete your profile setup to start connecting with creators
            </p>
          </div>

          {/* Specialization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Industry Specialization
              </CardTitle>
              <CardDescription>
                Describe your area of expertise and industry focus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Textarea
                  id="specialization"
                  placeholder="e.g. Music Industry Marketing, Tech Product Development, Fashion Editorial..."
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleUpdateProfile}
                disabled={loading || !specialization.trim()}
              >
                {loading ? "Updating..." : "Update Specialization"}
              </Button>
            </CardContent>
          </Card>

          {/* Organization Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Setup
              </CardTitle>
              <CardDescription>
                Join an existing organization or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowOrgDialog(true)}
                variant="outline"
                className="w-full"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Setup Organization
              </Button>
            </CardContent>
          </Card>

          {/* Visibility Settings */}
          <CreatorOnlyToggle 
            userId={user.id} 
            initialValue={profile.creator_only_mode || false} 
          />

          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => navigate('/')}
              size="lg"
            >
              Complete Setup
            </Button>
          </div>
        </div>
      </div>

      <OrganizationJoinDialog 
        open={showOrgDialog}
        onOpenChange={setShowOrgDialog}
        userId={user.id}
      />
    </div>
  )
}

export default IndustryResourceSetup