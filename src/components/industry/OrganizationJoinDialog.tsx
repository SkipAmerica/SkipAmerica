import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Organization {
  id: string
  name: string
  verified: boolean
}

interface OrganizationJoinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function OrganizationJoinDialog({ open, onOpenChange, userId }: OrganizationJoinDialogProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>("")
  const [newOrgName, setNewOrgName] = useState("")
  const [newOrgDescription, setNewOrgDescription] = useState("")
  const [mode, setMode] = useState<"join" | "create">("join")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchOrganizations()
    }
  }, [open])

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, verified')
      .eq('verified', true)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch organizations",
        variant: "destructive"
      })
      return
    }

    setOrganizations(data || [])
  }

  const handleJoinOrganization = async () => {
    if (!selectedOrgId) return

    setLoading(true)
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: selectedOrgId,
        user_id: userId,
        role: 'member',
        approved: false
      })

    setLoading(false)

    if (error) {
      toast({
        title: "Error", 
        description: "Failed to join organization",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Request sent! Awaiting admin approval."
    })
    onOpenChange(false)
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: newOrgName,
        admin_user_id: userId,
        verified: false
      })
      .select()
      .single()

    if (error) {
      setLoading(false)
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive"
      })
      return
    }

    // Create organization rules with defaults
    await supabase
      .from('organization_rules')
      .insert({
        organization_id: data.id
      })

    setLoading(false)
    toast({
      title: "Success", 
      description: "Organization created! Pending verification."
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Organization Setup</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              variant={mode === "join" ? "default" : "outline"}
              onClick={() => setMode("join")}
              className="flex-1"
            >
              Join Existing
            </Button>
            <Button 
              variant={mode === "create" ? "default" : "outline"}
              onClick={() => setMode("create")}
              className="flex-1"
            >
              Create New
            </Button>
          </div>

          {mode === "join" ? (
            <div className="space-y-4">
              <div>
                <Label>Select Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleJoinOrganization} 
                disabled={!selectedOrgId || loading}
                className="w-full"
              >
                {loading ? "Sending Request..." : "Request to Join"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Vibe Magazine, Walmart Corp"
                />
              </div>
              <div>
                <Label htmlFor="orgDesc">Description (Optional)</Label>
                <Textarea
                  id="orgDesc"
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  placeholder="Brief description of your organization..."
                />
              </div>
              <Button 
                onClick={handleCreateOrganization} 
                disabled={!newOrgName.trim() || loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}