import { Badge } from "@/components/ui/badge"
import { Building2, Briefcase, Crown, User, Verified } from "lucide-react"
import { cn } from "@/lib/utils"

type AccountType = 'fan' | 'creator' | 'agency' | 'industry_resource'

interface AccountBadgeProps {
  accountType: AccountType
  isVerified?: boolean
  isOrgVerified?: boolean
  className?: string
}

export function AccountBadge({ accountType, isVerified, isOrgVerified, className }: AccountBadgeProps) {
  const getAccountConfig = (type: AccountType) => {
    switch (type) {
      case 'creator':
        return { 
          label: 'Creator', 
          icon: Crown, 
          variant: 'default' as const,
          color: 'text-primary'
        }
      case 'agency':
        return { 
          label: 'Agency', 
          icon: Building2, 
          variant: 'secondary' as const,
          color: 'text-blue-600'
        }
      case 'industry_resource':
        return { 
          label: 'Industry Resource', 
          icon: Briefcase, 
          variant: 'outline' as const,
          color: 'text-purple-600'
        }
      default:
        return { 
          label: 'User', 
          icon: User, 
          variant: 'outline' as const,
          color: 'text-muted-foreground'
        }
    }
  }

  const config = getAccountConfig(accountType)
  const Icon = config.icon

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", config.color)} />
        {config.label}
      </Badge>
      
      {isOrgVerified && (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <Verified className="h-3 w-3 mr-1" />
          Org Verified
        </Badge>
      )}
      
      {isVerified && !isOrgVerified && (
        <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Verified className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      )}
    </div>
  )
}