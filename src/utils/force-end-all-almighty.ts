import { supabase } from '@/integrations/supabase/client'

export async function forceEndAllAlmighty() {
  try {
    const { data, error } = await supabase.functions.invoke('force-end-almighty')
    
    if (error) {
      console.error('Failed to force-end sessions:', error)
      return { success: false, error }
    }
    
    console.log('✅ Force-end complete:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Error calling force-end:', err)
    return { success: false, error: err }
  }
}

// Expose globally in dev mode for manual triggering
if (import.meta.env.DEV) {
  (window as any).forceEndAllAlmighty = forceEndAllAlmighty
}
