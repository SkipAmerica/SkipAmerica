import { supabase } from '@/integrations/supabase/client'

// Utility to clear all creator queues - run once
export async function clearAllQueues() {
  try {
    const { data, error } = await supabase.functions.invoke('clear-all-queues')
    
    if (error) {
      console.error('Failed to clear queues:', error)
      return { success: false, error }
    }
    
    console.log('All queues cleared:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Error clearing queues:', err)
    return { success: false, error: err }
  }
}

// Auto-run on import (one-time execution)
clearAllQueues().then(result => {
  if (result.success) {
    console.log('✅ All creator queues have been cleared')
  } else {
    console.error('❌ Failed to clear queues:', result.error)
  }
})
