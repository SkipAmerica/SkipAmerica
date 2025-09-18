// Domain entities - Core business models
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  account_type: 'fan' | 'creator' | 'agency' | 'industry_resource'
  is_verified?: boolean
  created_at: string
  updated_at: string
}

export interface Creator {
  id: string
  full_name: string
  bio?: string
  avatar_url?: string
  categories: string[]
  base_rate_min?: number
  base_rate_max?: number
  base_rate_currency: string
  available_for_booking: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  celebrity_tier: 'Rising' | 'Established' | 'Celebrity' | 'Icon'
  total_followers?: number
  avg_engagement_rate?: number
  location_city?: string
  location_country?: string
  created_at: string
  updated_at: string
}

export interface Agency {
  id: string
  name: string
  description?: string
  owner_id: string
  yearly_fee?: number
  subscription_status: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  creator_id: string
  fan_id: string
  scheduled_at: string
  duration_minutes: number
  amount: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: 'text' | 'image' | 'file'
  created_at: string
  read_at?: string
}

// Common interface patterns
export interface EntityWithId {
  id: string
}

export interface EntityWithTimestamps extends EntityWithId {
  created_at: string
  updated_at: string
}

export interface EntityWithUser extends EntityWithTimestamps {
  user_id: string
}