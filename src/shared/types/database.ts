// Database-specific types
// Re-export and extend Supabase generated types
import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types'

export type { Database, Tables, TablesInsert, TablesUpdate, Enums }

// Type helpers for easier usage
export type ProfileRow = Tables<'profiles'>
export type CreatorRow = Tables<'creators'>
export type AppointmentRow = Tables<'appointments'>
export type MessageRow = Tables<'messages'>
export type AgencyRow = Tables<'agencies'>

export type ProfileInsert = TablesInsert<'profiles'>
export type CreatorInsert = TablesInsert<'creators'>
export type AppointmentInsert = TablesInsert<'appointments'>
export type MessageInsert = TablesInsert<'messages'>
export type AgencyInsert = TablesInsert<'agencies'>

export type ProfileUpdate = TablesUpdate<'profiles'>
export type CreatorUpdate = TablesUpdate<'creators'>
export type AppointmentUpdate = TablesUpdate<'appointments'>
export type MessageUpdate = TablesUpdate<'messages'>
export type AgencyUpdate = TablesUpdate<'agencies'>

// Enum helpers
export type AccountType = Enums<'account_type'>
export type VerificationStatus = Enums<'verification_status'>
export type CelebrityTier = Enums<'celebrity_tier'>
export type PlatformName = Enums<'platform_name'>
export type SocialPlatform = Enums<'social_platform'>
export type OfferType = Enums<'offer_type'>

// Join types for complex queries
export interface CreatorWithStats extends CreatorRow {
  platform_stats?: Tables<'platform_stats'>[]
  reliability?: Tables<'creator_reliability'>
}

export interface AppointmentWithDetails extends AppointmentRow {
  creator: CreatorRow
  fan: ProfileRow
}

export interface MessageWithUsers extends MessageRow {
  sender: ProfileRow
  receiver: ProfileRow
}