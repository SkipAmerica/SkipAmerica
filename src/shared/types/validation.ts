// Zod schemas for runtime validation
import { z } from 'zod'

// Base schemas
export const idSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email format')
export const urlSchema = z.string().url('Invalid URL format')

// User schemas
export const userSchema = z.object({
  id: idSchema,
  email: emailSchema,
  full_name: z.string().min(1, 'Name is required').optional(),
  avatar_url: urlSchema.optional(),
  account_type: z.enum(['fan', 'creator', 'agency', 'industry_resource']),
  is_verified: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
})

export const userInsertSchema = userSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
})

export const userUpdateSchema = userInsertSchema.partial()

// Creator schemas
export const creatorSchema = z.object({
  id: idSchema,
  full_name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  avatar_url: urlSchema.optional(),
  categories: z.array(z.string()).default([]),
  base_rate_min: z.number().min(0, 'Rate must be positive').optional(),
  base_rate_max: z.number().min(0, 'Rate must be positive').optional(),
  base_rate_currency: z.string().default('USD'),
  available_for_booking: z.boolean().default(true),
  verification_status: z.enum(['pending', 'verified', 'rejected']),
  celebrity_tier: z.enum(['Rising', 'Established', 'Celebrity', 'Icon']),
  total_followers: z.number().min(0).optional(),
  location_city: z.string().optional(),
  location_country: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const creatorFiltersSchema = z.object({
  query: z.string().default(''),
  selectedCategory: z.string().default('all'),
  sortBy: z.enum(['relevance', 'rating', 'price', 'availability']).default('relevance'),
  showOnlineOnly: z.boolean().default(false),
  showAvailableOnly: z.boolean().default(false),
  priceRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
  location: z.string().optional(),
  verifiedOnly: z.boolean().default(false),
})

// Appointment schemas
export const appointmentSchema = z.object({
  id: idSchema,
  creator_id: idSchema,
  fan_id: idSchema,
  scheduled_at: z.string(),
  duration_minutes: z.number().min(5, 'Minimum 5 minutes').max(120, 'Maximum 2 hours'),
  amount: z.number().min(0, 'Amount must be positive'),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']),
  created_at: z.string(),
  updated_at: z.string(),
})

export const appointmentInsertSchema = appointmentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

// Message schemas
export const messageSchema = z.object({
  id: idSchema,
  sender_id: idSchema,
  receiver_id: idSchema,
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  message_type: z.enum(['text', 'image', 'file']).default('text'),
  created_at: z.string(),
  read_at: z.string().optional(),
})

export const messageInsertSchema = messageSchema.omit({
  id: true,
  created_at: true,
})

// API response schemas
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    error: z.string().optional(),
    message: z.string().optional(),
  })

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
  })

// Error schemas
export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
})

// Export type inferences
export type User = z.infer<typeof userSchema>
export type UserInsert = z.infer<typeof userInsertSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>
export type Creator = z.infer<typeof creatorSchema>
export type CreatorFilters = z.infer<typeof creatorFiltersSchema>
export type Appointment = z.infer<typeof appointmentSchema>
export type AppointmentInsert = z.infer<typeof appointmentInsertSchema>
export type Message = z.infer<typeof messageSchema>
export type MessageInsert = z.infer<typeof messageInsertSchema>
export type APIError = z.infer<typeof apiErrorSchema>