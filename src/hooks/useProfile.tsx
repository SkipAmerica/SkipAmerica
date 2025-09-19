import { useState, useEffect } from 'react'
import { useAuth } from "@/app/providers/auth-provider";
import { supabase } from '@/integrations/supabase/client'

interface Profile {
  id: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  account_type: 'fan' | 'creator' | 'agency' | 'industry_resource'
  is_verified: boolean | null
}

export const useProfile = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, bio, avatar_url, account_type, is_verified, interests, created_at')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
        } else {
          setProfile(data)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  return { profile, loading }
}