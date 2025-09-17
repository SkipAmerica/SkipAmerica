import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Building2, User, Calendar } from "lucide-react"

interface PendingResource {
  id: string
  full_name: string
  avatar_url: string
  industry_specialization: string
  created_at: string
}

interface PendingOrganization {
  id: string
  name: string
  admin_user_id: string
  created_at: string
  admin_profile?: {
    full_name: string
    avatar_url: string
    id: string
  }
}

export function IndustryResourceApprovalPanel() {
  const [pendingResources, setPendingResources] = useState<PendingResource[]>([])
  const [pendingOrgs, setPendingOrgs] = useState<PendingOrganization[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingItems()
  }, [])

  const fetchPendingItems = async () => {
    // Fetch pending industry resources (not organization-verified)
    const { data: resources } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, industry_specialization, created_at')
      .eq('account_type', 'industry_resource')
      .eq('independent_verified', false)

    // Fetch pending organizations  
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, admin_user_id, created_at')
      .eq('verified', false)

    // Fetch admin profiles for organizations
    if (orgs && orgs.length > 0) {
      const adminIds = orgs.map(org => org.admin_user_id)
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', adminIds)

      const orgsWithProfiles = orgs.map(org => ({
        ...org,
        admin_profile: adminProfiles?.find(profile => profile.id === org.admin_user_id)
      }))
      
      setPendingOrgs(orgsWithProfiles)
    } else {
      setPendingOrgs([])
    }

    setPendingResources(resources || [])
  }

  const handleApproveResource = async (resourceId: string) => {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ independent_verified: true })
      .eq('id', resourceId)

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve resource",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Industry resource approved"
    })
    fetchPendingItems()
  }

  const handleApproveOrganization = async (orgId: string) => {
    setLoading(true)
    const { error } = await supabase
      .from('organizations')
      .update({ verified: true })
      .eq('id', orgId)

    setLoading(false)

    if (error) {
      toast({
        title: "Error", 
        description: "Failed to approve organization",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Success",
      description: "Organization approved"
    })
    fetchPendingItems()
  }

  const handleRejectResource = async (resourceId: string) => {
    setLoading(true)
    // For now, we'll just remove the industry_resource account type
    const { error } = await supabase
      .from('profiles')
      .update({ account_type: 'fan' })
      .eq('id', resourceId)

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject resource", 
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Resource Rejected",
      description: "Account reverted to User type"
    })
    fetchPendingItems()
  }

  const handleRejectOrganization = async (orgId: string) => {
    setLoading(true)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)

    setLoading(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject organization",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Organization Rejected",
      description: "Organization has been removed"
    })
    fetchPendingItems()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Industry Resource Admin Panel</CardTitle>
        <CardDescription>
          Approve or reject industry resource accounts and organizations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resources" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Pending Resources ({pendingResources.length})
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Pending Organizations ({pendingOrgs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-4">
            {pendingResources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending industry resources
              </div>
            ) : (
              pendingResources.map((resource) => (
                <Card key={resource.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={resource.avatar_url} />
                          <AvatarFallback>{resource.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{resource.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {resource.industry_specialization || "No specialization specified"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(resource.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveResource(resource.id)}
                          disabled={loading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectResource(resource.id)}
                          disabled={loading}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            {pendingOrgs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending organizations
              </div>
            ) : (
              pendingOrgs.map((org) => (
                <Card key={org.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{org.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Admin: {org.admin_profile?.full_name || "Unknown"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(org.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm" 
                          onClick={() => handleApproveOrganization(org.id)}
                          disabled={loading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectOrganization(org.id)}
                          disabled={loading}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}