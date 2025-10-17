// Root provider that wraps all other providers
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveStoreProvider } from '@/stores/live-store'
import { AuthProvider } from './auth-provider'
import { SessionSyncMount } from './SessionSyncMount'
import { SearchProvider } from './search-provider'
import { DiscoveryProvider } from './discovery-provider'
import { MediaProvider } from '@/modules/almighty/providers/MediaProvider'
import { TabProvider } from './tab-provider'
import { config } from '@/shared/config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: config.cache.staleTime,
      gcTime: config.cache.cacheTime, // Renamed from cacheTime in newer versions
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionSyncMount />
        <MediaProvider>
          <LiveStoreProvider>
            <TabProvider>
              <SearchProvider>
                <DiscoveryProvider>
                  <TooltipProvider>
                    {children}
                    <Toaster />
                    <Sonner />
                  </TooltipProvider>
                </DiscoveryProvider>
              </SearchProvider>
            </TabProvider>
          </LiveStoreProvider>
        </MediaProvider>
      </AuthProvider>
      {config.isDevelopment && (
        <div>
          {/* React Query DevTools would go here in development */}
        </div>
      )}
    </QueryClientProvider>
  )
}