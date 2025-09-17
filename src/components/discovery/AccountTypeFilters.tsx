import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Briefcase, Crown, User } from "lucide-react"

interface AccountTypeFiltersProps {
  showCreators: boolean
  showUsers: boolean  
  showAgencies: boolean
  showIndustryResources: boolean
  showCreatorOnlyResources: boolean
  onShowCreatorsChange: (checked: boolean) => void
  onShowUsersChange: (checked: boolean) => void
  onShowAgenciesChange: (checked: boolean) => void
  onShowIndustryResourcesChange: (checked: boolean) => void
  onShowCreatorOnlyResourcesChange: (checked: boolean) => void
  currentUserIsCreator?: boolean
}

export function AccountTypeFilters({
  showCreators,
  showUsers,
  showAgencies, 
  showIndustryResources,
  showCreatorOnlyResources,
  onShowCreatorsChange,
  onShowUsersChange,
  onShowAgenciesChange,
  onShowIndustryResourcesChange,
  onShowCreatorOnlyResourcesChange,
  currentUserIsCreator = false
}: AccountTypeFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-creators"
            checked={showCreators}
            onCheckedChange={onShowCreatorsChange}
          />
          <Crown className="h-4 w-4 text-primary" />
          <Label htmlFor="show-creators" className="text-sm font-medium">
            Creators
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-users"
            checked={showUsers}
            onCheckedChange={onShowUsersChange}
          />
          <User className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="show-users" className="text-sm font-medium">
            Users
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-agencies"
            checked={showAgencies}
            onCheckedChange={onShowAgenciesChange}
          />
          <Building2 className="h-4 w-4 text-blue-600" />
          <Label htmlFor="show-agencies" className="text-sm font-medium">
            Agencies
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-industry-resources"
            checked={showIndustryResources}
            onCheckedChange={onShowIndustryResourcesChange}
          />
          <Briefcase className="h-4 w-4 text-purple-600" />
          <Label htmlFor="show-industry-resources" className="text-sm font-medium">
            Industry Resources
          </Label>
        </div>

        {currentUserIsCreator && (
          <div className="flex items-center space-x-2 pl-4 border-l-2 border-muted">
            <Checkbox
              id="show-creator-only-resources"
              checked={showCreatorOnlyResources}
              onCheckedChange={onShowCreatorOnlyResourcesChange}
            />
            <Briefcase className="h-4 w-4 text-purple-400" />
            <Label htmlFor="show-creator-only-resources" className="text-sm font-medium text-muted-foreground">
              Creator-Only Resources
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  )
}