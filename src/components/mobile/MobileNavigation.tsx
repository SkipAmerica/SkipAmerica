import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  ShoppingCart, 
  User, 
  Users, 
  FileText,
  Home 
} from "lucide-react";

interface MobileNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  profile?: {
    name: string;
    avatar?: string;
  };
  unreadMessages?: number;
}

export function MobileNavigation({ 
  activeTab = "home", 
  onTabChange,
  profile,
  unreadMessages = 0 
}: MobileNavigationProps) {
  const navItems = [
    {
      id: "inbox",
      icon: MessageSquare,
      label: "Inbox",
      badge: unreadMessages,
    },
    {
      id: "marketplace",
      icon: ShoppingCart,
      label: "Marketplace",
    },
    {
      id: "profile",
      icon: User,
      label: "Profile",
      isProfile: true,
    },
    {
      id: "live",
      icon: Users,
      label: "Live Experts",
    },
    {
      id: "post",
      icon: FileText,
      label: "Post",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      {/* Navigation Items */}
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          
          if (item.isProfile && profile) {
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2 relative"
                onClick={() => onTabChange?.(item.id)}
              >
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                      {profile.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-primary rounded-full" />
                  )}
                </div>
                <span className="text-xs text-gray-600">{item.label}</span>
              </Button>
            );
          }
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 relative"
              onClick={() => onTabChange?.(item.id)}
            >
              <div className="relative">
                {/* OSMO-style circular background */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-primary text-primary-foreground shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}>
                  <IconComponent className="w-5 h-5" />
                </div>
                
                {/* Badge for notifications */}
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Profile update prompt - OSMO style */}
      <div className="text-center mt-2">
        <p className="text-xs text-gray-500 italic">
          Let's keep that profile updated
        </p>
      </div>
    </div>
  );
}