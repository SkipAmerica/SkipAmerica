import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SearchProvider } from "@/contexts/SearchContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import IndustryResourceSetup from "./pages/IndustryResourceSetup";
import NotFound from "./pages/NotFound";
import { PWAInstallPrompt } from "@/components/mobile/PWAInstallPrompt";
import { IOSAppShell } from "@/components/mobile/IOSAppShell";

const App = () => {
  console.log('Skip app is loading...');
  
  return (
    <AuthProvider>
      <SearchProvider>
        <TooltipProvider>
          <IOSAppShell>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/industry-setup" element={<IndustryResourceSetup />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <PWAInstallPrompt />
          </IOSAppShell>
        </TooltipProvider>
      </SearchProvider>
    </AuthProvider>
  );
};

export default App;
