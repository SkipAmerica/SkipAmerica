export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_placements: {
        Row: {
          click_through_rate: number | null
          clicks: number | null
          created_at: string
          id: string
          impressions: number | null
          placement_type: string
          revenue_generated: number | null
          sponsor_id: string
          target_creator_id: string | null
          target_user_id: string | null
        }
        Insert: {
          click_through_rate?: number | null
          clicks?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          placement_type: string
          revenue_generated?: number | null
          sponsor_id: string
          target_creator_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          click_through_rate?: number | null
          clicks?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          placement_type?: string
          revenue_generated?: number | null
          sponsor_id?: string
          target_creator_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ad_placements_sponsor_id"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          subscription_end_date: string | null
          subscription_status: string | null
          updated_at: string
          yearly_fee: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string
          yearly_fee?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string
          yearly_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_creators: {
        Row: {
          agency_id: string
          created_at: string
          creator_id: string
          id: string
          permissions: Json | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          creator_id: string
          id?: string
          permissions?: Json | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          permissions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_creators_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_creators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      almighty_sessions: {
        Row: {
          created_at: string
          creator_id: string
          duration_seconds: number | null
          ended_at: string | null
          fan_id: string
          id: string
          is_dev: boolean
          queue_entry_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          fan_id: string
          id?: string
          is_dev?: boolean
          queue_entry_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          fan_id?: string
          id?: string
          is_dev?: boolean
          queue_entry_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "almighty_sessions_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "call_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_messages: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          is_date_suggestion: boolean
          message: string
          sender_id: string
          suggested_date: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          is_date_suggestion?: boolean
          message: string
          sender_id: string
          suggested_date?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          is_date_suggestion?: boolean
          message?: string
          sender_id?: string
          suggested_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_waitlist: {
        Row: {
          created_at: string
          creator_id: string
          duration_minutes: number
          fan_id: string
          id: string
          notes: string | null
          notified_at: string | null
          position: number
          requested_date: string
          requested_time: string
          status: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration_minutes?: number
          fan_id: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          position?: number
          requested_date: string
          requested_time: string
          status?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration_minutes?: number
          fan_id?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          position?: number
          requested_date?: string
          requested_time?: string
          status?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          amount: number
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string
          creator_id: string
          duration_minutes: number
          fan_id: string
          id: string
          reliability_impact: number | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          creator_id: string
          duration_minutes?: number
          fan_id: string
          id?: string
          reliability_impact?: number | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          creator_id?: string
          duration_minutes?: number
          fan_id?: string
          id?: string
          reliability_impact?: number | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_file_shares: {
        Row: {
          call_id: string
          created_at: string
          downloaded_at: string | null
          file_id: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          recipient_id: string
          sender_id: string
          shared_at: string
        }
        Insert: {
          call_id: string
          created_at?: string
          downloaded_at?: string | null
          file_id?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          recipient_id: string
          sender_id: string
          shared_at?: string
        }
        Update: {
          call_id?: string
          created_at?: string
          downloaded_at?: string | null
          file_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          recipient_id?: string
          sender_id?: string
          shared_at?: string
        }
        Relationships: []
      }
      call_performance_metrics: {
        Row: {
          avg_call_duration: number | null
          avg_wait_time: number | null
          caller_velocity: number | null
          conversion_rate: number | null
          created_at: string | null
          creator_id: string
          id: string
          period_end: string
          period_start: string
          price_sensitivity_score: number | null
          repeat_caller_rate: number | null
          total_calls: number | null
          total_revenue: number | null
        }
        Insert: {
          avg_call_duration?: number | null
          avg_wait_time?: number | null
          caller_velocity?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          creator_id: string
          id?: string
          period_end: string
          period_start: string
          price_sensitivity_score?: number | null
          repeat_caller_rate?: number | null
          total_calls?: number | null
          total_revenue?: number | null
        }
        Update: {
          avg_call_duration?: number | null
          avg_wait_time?: number | null
          caller_velocity?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          creator_id?: string
          id?: string
          period_end?: string
          period_start?: string
          price_sensitivity_score?: number | null
          repeat_caller_rate?: number | null
          total_calls?: number | null
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_performance_metrics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_private_messages: {
        Row: {
          conversation_key: string
          created_at: string
          id: string
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          conversation_key: string
          created_at?: string
          id?: string
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          conversation_key?: string
          created_at?: string
          id?: string
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      call_queue: {
        Row: {
          created_at: string
          creator_id: string
          discussion_topic: string | null
          estimated_wait_minutes: number | null
          fan_camera_ready: boolean
          fan_has_consented: boolean
          fan_id: string
          fan_phone_number: string | null
          fan_preview_updated_at: string | null
          fan_state: Database["public"]["Enums"]["queue_fan_state"]
          id: string
          joined_at: string
          last_seen: string | null
          priority: number
          status: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          discussion_topic?: string | null
          estimated_wait_minutes?: number | null
          fan_camera_ready?: boolean
          fan_has_consented?: boolean
          fan_id: string
          fan_phone_number?: string | null
          fan_preview_updated_at?: string | null
          fan_state?: Database["public"]["Enums"]["queue_fan_state"]
          id?: string
          joined_at?: string
          last_seen?: string | null
          priority?: number
          status?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          discussion_topic?: string | null
          estimated_wait_minutes?: number | null
          fan_camera_ready?: boolean
          fan_has_consented?: boolean
          fan_id?: string
          fan_phone_number?: string | null
          fan_preview_updated_at?: string | null
          fan_state?: Database["public"]["Enums"]["queue_fan_state"]
          id?: string
          joined_at?: string
          last_seen?: string | null
          priority?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_call_queue_creator_id"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_call_queue_fan_id"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_events: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          host_creator_id: string
          id: string
          max_participants: number | null
          scheduled_at: string
          status: string
          title: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_creator_id: string
          id?: string
          max_participants?: number | null
          scheduled_at: string
          status?: string
          title: string
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_creator_id?: string
          id?: string
          max_participants?: number | null
          scheduled_at?: string
          status?: string
          title?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_collaborative_events_host_creator_id"
            columns: ["host_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          comment_text: string
          content_id: string
          created_at: string
          id: string
          parent_comment_id: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          content_id: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          content_id?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "creator_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_content_comments_parent_id"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      content_deletion_log: {
        Row: {
          content_id: string
          content_snapshot: Json
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          id: string
        }
        Insert: {
          content_id: string
          content_snapshot: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
        }
        Update: {
          content_id?: string
          content_snapshot?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
        }
        Relationships: []
      }
      content_reactions: {
        Row: {
          content_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "creator_content"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_availability: {
        Row: {
          created_at: string
          creator_id: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_call_pricing: {
        Row: {
          created_at: string
          creator_id: string
          duration_minutes: number
          id: string
          is_active: boolean
          price_per_block: number
          pricing_mode: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          price_per_block: number
          pricing_mode?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price_per_block?: number
          pricing_mode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_content: {
        Row: {
          aspect_ratio: string | null
          comment_count: number | null
          content_type: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          duration_sec: number | null
          id: string
          like_count: number | null
          media_status: string | null
          media_url: string | null
          metadata: Json | null
          mux_upload_id: string | null
          platform_post_id: string
          playback_id: string | null
          provider: string | null
          published_at: string | null
          social_account_id: string
          thumbnail_url: string | null
          title: string | null
          view_count: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          comment_count?: number | null
          content_type: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          duration_sec?: number | null
          id?: string
          like_count?: number | null
          media_status?: string | null
          media_url?: string | null
          metadata?: Json | null
          mux_upload_id?: string | null
          platform_post_id: string
          playback_id?: string | null
          provider?: string | null
          published_at?: string | null
          social_account_id: string
          thumbnail_url?: string | null
          title?: string | null
          view_count?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          comment_count?: number | null
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          duration_sec?: number | null
          id?: string
          like_count?: number | null
          media_status?: string | null
          media_url?: string | null
          metadata?: Json | null
          mux_upload_id?: string | null
          platform_post_id?: string
          playback_id?: string | null
          provider?: string | null
          published_at?: string | null
          social_account_id?: string
          thumbnail_url?: string | null
          title?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_content_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_files: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_favorite: boolean | null
          last_shared: string | null
          share_count: number | null
          updated_at: string
          upload_date: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_favorite?: boolean | null
          last_shared?: string | null
          share_count?: number | null
          updated_at?: string
          upload_date?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_favorite?: boolean | null
          last_shared?: string | null
          share_count?: number | null
          updated_at?: string
          upload_date?: string
        }
        Relationships: []
      }
      creator_market_analysis: {
        Row: {
          competitor_analysis: Json | null
          confidence_score: number | null
          created_at: string | null
          creator_id: string
          id: string
          last_updated: string | null
          market_position: string | null
          pricing_factors: Json | null
          suggested_price_per_minute: number
        }
        Insert: {
          competitor_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          creator_id: string
          id?: string
          last_updated?: string | null
          market_position?: string | null
          pricing_factors?: Json | null
          suggested_price_per_minute: number
        }
        Update: {
          competitor_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          creator_id?: string
          id?: string
          last_updated?: string | null
          market_position?: string | null
          pricing_factors?: Json | null
          suggested_price_per_minute?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_market_analysis_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_onboarding: {
        Row: {
          created_at: string
          creator_id: string
          has_display_name: boolean
          has_photo: boolean
          has_tagline: boolean
          has_username: boolean | null
          industries_count: number
          last_nudged_at: string | null
          onboarding_completed_at: string | null
          onboarding_skipped: boolean
          percent_complete: number
          search_unlocked: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          has_display_name?: boolean
          has_photo?: boolean
          has_tagline?: boolean
          has_username?: boolean | null
          industries_count?: number
          last_nudged_at?: string | null
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean
          percent_complete?: number
          search_unlocked?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          has_display_name?: boolean
          has_photo?: boolean
          has_tagline?: boolean
          has_username?: boolean | null
          industries_count?: number
          last_nudged_at?: string | null
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean
          percent_complete?: number
          search_unlocked?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_onboarding_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_playlists: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_featured: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_creator_playlists_creator_id"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_presence: {
        Row: {
          creator_id: string
          is_online: boolean | null
          last_heartbeat: string | null
          updated_at: string | null
        }
        Insert: {
          creator_id: string
          is_online?: boolean | null
          last_heartbeat?: string | null
          updated_at?: string | null
        }
        Update: {
          creator_id?: string
          is_online?: boolean | null
          last_heartbeat?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_presence_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_press_coverage: {
        Row: {
          article_content: string | null
          article_url: string
          created_at: string | null
          creator_id: string
          id: string
          impact_score: number | null
          mentions_count: number | null
          publication: string | null
          published_date: string | null
          relevance_score: number | null
          sentiment_score: number | null
          title: string | null
        }
        Insert: {
          article_content?: string | null
          article_url: string
          created_at?: string | null
          creator_id: string
          id?: string
          impact_score?: number | null
          mentions_count?: number | null
          publication?: string | null
          published_date?: string | null
          relevance_score?: number | null
          sentiment_score?: number | null
          title?: string | null
        }
        Update: {
          article_content?: string | null
          article_url?: string
          created_at?: string | null
          creator_id?: string
          id?: string
          impact_score?: number | null
          mentions_count?: number | null
          publication?: string | null
          published_date?: string | null
          relevance_score?: number | null
          sentiment_score?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_press_coverage_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_reliability: {
        Row: {
          cancelled_appointments: number
          creator_id: string
          kept_appointments: number
          last_updated: string
          reliability_score: number
          rescheduled_appointments: number
          total_appointments: number
        }
        Insert: {
          cancelled_appointments?: number
          creator_id: string
          kept_appointments?: number
          last_updated?: string
          reliability_score?: number
          rescheduled_appointments?: number
          total_appointments?: number
        }
        Update: {
          cancelled_appointments?: number
          creator_id?: string
          kept_appointments?: number
          last_updated?: string
          reliability_score?: number
          rescheduled_appointments?: number
          total_appointments?: number
        }
        Relationships: []
      }
      creator_social_analysis: {
        Row: {
          account_age_months: number | null
          audience_quality_score: number | null
          avg_comments_per_post: number | null
          avg_likes_per_post: number | null
          created_at: string | null
          creator_id: string
          engagement_rate: number | null
          follower_count: number | null
          id: string
          influence_score: number | null
          last_analyzed: string | null
          platform: string
          posting_frequency: number | null
          verified_status: boolean | null
        }
        Insert: {
          account_age_months?: number | null
          audience_quality_score?: number | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          created_at?: string | null
          creator_id: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          influence_score?: number | null
          last_analyzed?: string | null
          platform: string
          posting_frequency?: number | null
          verified_status?: boolean | null
        }
        Update: {
          account_age_months?: number | null
          audience_quality_score?: number | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          created_at?: string | null
          creator_id?: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          influence_score?: number | null
          last_analyzed?: string | null
          platform?: string
          posting_frequency?: number | null
          verified_status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_social_analysis_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          available_for_booking: boolean | null
          avatar_url: string | null
          avg_engagement_rate: number | null
          background_image_url: string | null
          base_rate_currency: string | null
          base_rate_max: number | null
          base_rate_min: number | null
          bio: string | null
          categories: string[] | null
          celebrity_tier: Database["public"]["Enums"]["celebrity_tier"] | null
          created_at: string | null
          do_not_contact: boolean | null
          full_name: string
          headline: string | null
          id: string
          is_online: boolean | null
          is_suppressed: boolean | null
          languages: string[] | null
          last_activity_at: string | null
          last_seen_at: string | null
          location_city: string | null
          location_country: string | null
          long_bio: string | null
          political_opt_in: boolean | null
          political_tags: string[] | null
          press_mentions_30d: number | null
          press_mentions_total: number | null
          press_opt_in: boolean | null
          profile_completeness: number | null
          response_time_hours: number | null
          risk_flags: string[] | null
          total_followers: number | null
          updated_at: string | null
          username: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          available_for_booking?: boolean | null
          avatar_url?: string | null
          avg_engagement_rate?: number | null
          background_image_url?: string | null
          base_rate_currency?: string | null
          base_rate_max?: number | null
          base_rate_min?: number | null
          bio?: string | null
          categories?: string[] | null
          celebrity_tier?: Database["public"]["Enums"]["celebrity_tier"] | null
          created_at?: string | null
          do_not_contact?: boolean | null
          full_name: string
          headline?: string | null
          id?: string
          is_online?: boolean | null
          is_suppressed?: boolean | null
          languages?: string[] | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          location_city?: string | null
          location_country?: string | null
          long_bio?: string | null
          political_opt_in?: boolean | null
          political_tags?: string[] | null
          press_mentions_30d?: number | null
          press_mentions_total?: number | null
          press_opt_in?: boolean | null
          profile_completeness?: number | null
          response_time_hours?: number | null
          risk_flags?: string[] | null
          total_followers?: number | null
          updated_at?: string | null
          username?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          available_for_booking?: boolean | null
          avatar_url?: string | null
          avg_engagement_rate?: number | null
          background_image_url?: string | null
          base_rate_currency?: string | null
          base_rate_max?: number | null
          base_rate_min?: number | null
          bio?: string | null
          categories?: string[] | null
          celebrity_tier?: Database["public"]["Enums"]["celebrity_tier"] | null
          created_at?: string | null
          do_not_contact?: boolean | null
          full_name?: string
          headline?: string | null
          id?: string
          is_online?: boolean | null
          is_suppressed?: boolean | null
          languages?: string[] | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          location_city?: string | null
          location_country?: string | null
          long_bio?: string | null
          political_opt_in?: boolean | null
          political_tags?: string[] | null
          press_mentions_30d?: number | null
          press_mentions_total?: number | null
          press_opt_in?: boolean | null
          profile_completeness?: number | null
          response_time_hours?: number | null
          risk_flags?: string[] | null
          total_followers?: number | null
          updated_at?: string | null
          username?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      event_collaborators: {
        Row: {
          created_at: string
          creator_id: string
          event_id: string
          id: string
          profit_share_percentage: number
          role: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          event_id: string
          id?: string
          profit_share_percentage?: number
          role?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          event_id?: string
          id?: string
          profit_share_percentage?: number
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_collaborators_creator_id"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_collaborators_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "collaborative_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          amount_paid: number
          created_at: string
          event_id: string
          id: string
          registration_status: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          event_id: string
          id?: string
          registration_status?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          event_id?: string
          id?: string
          registration_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_registrations_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "collaborative_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_registrations_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_loyalty: {
        Row: {
          created_at: string
          creator_id: string
          fan_id: string
          id: string
          last_interaction: string | null
          points: number | null
          tier_level: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          fan_id: string
          id?: string
          last_interaction?: string | null
          points?: number | null
          tier_level?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          fan_id?: string
          id?: string
          last_interaction?: string | null
          points?: number | null
          tier_level?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_fan_loyalty_creator_id"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fan_loyalty_fan_id"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          calls_taken: number
          created_at: string
          creator_id: string
          ended_at: string | null
          id: string
          queue_peak_count: number
          session_duration_minutes: number | null
          started_at: string
          total_earnings_cents: number
          updated_at: string
        }
        Insert: {
          calls_taken?: number
          created_at?: string
          creator_id: string
          ended_at?: string | null
          id?: string
          queue_peak_count?: number
          session_duration_minutes?: number | null
          started_at?: string
          total_earnings_cents?: number
          updated_at?: string
        }
        Update: {
          calls_taken?: number
          created_at?: string
          creator_id?: string
          ended_at?: string | null
          id?: string
          queue_peak_count?: number
          session_duration_minutes?: number | null
          started_at?: string
          total_earnings_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      lobby_chat_messages: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          message_type: string
          mtype: Database["public"]["Enums"]["message_type"]
          read_at: string | null
          read_by_creator: boolean
          read_by_user: boolean
          receiver_id: string
          sender_id: string
          thread_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_type?: string
          mtype?: Database["public"]["Enums"]["message_type"]
          read_at?: string | null
          read_by_creator?: boolean
          read_by_user?: boolean
          receiver_id: string
          sender_id: string
          thread_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_type?: string
          mtype?: Database["public"]["Enums"]["message_type"]
          read_at?: string | null
          read_by_creator?: boolean
          read_by_user?: boolean
          receiver_id?: string
          sender_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_rates: {
        Row: {
          created_at: string | null
          creator_id: string
          currency: string | null
          id: string
          is_active: boolean | null
          max_rate: number
          min_rate: number
          notes: string | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          max_rate?: number
          min_rate?: number
          notes?: string | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          max_rate?: number
          min_rate?: number
          notes?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_rates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          currency: string
          duration_minutes: number
          expires_at: string | null
          id: string
          note: string | null
          status: Database["public"]["Enums"]["offer_status"]
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          currency?: string
          duration_minutes: number
          expires_at?: string | null
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          currency?: string
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_rules: {
        Row: {
          created_at: string
          id: string
          max_session_duration: number | null
          min_review_score: number | null
          organization_id: string
          sensitive_words: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_session_duration?: number | null
          min_review_score?: number | null
          organization_id: string
          sensitive_words?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_session_duration?: number | null
          min_review_score?: number | null
          organization_id?: string
          sensitive_words?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          created_at: string | null
          creator_id: string
          engagement_rate_30d: number | null
          follower_count: number | null
          growth_rate_30d: number | null
          handle: string
          id: string
          is_visible: boolean | null
          last_sync_at: string | null
          platform: Database["public"]["Enums"]["platform_name"]
          updated_at: string | null
          verified_on_platform: boolean | null
          views_30d: number | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          engagement_rate_30d?: number | null
          follower_count?: number | null
          growth_rate_30d?: number | null
          handle: string
          id?: string
          is_visible?: boolean | null
          last_sync_at?: string | null
          platform: Database["public"]["Enums"]["platform_name"]
          updated_at?: string | null
          verified_on_platform?: boolean | null
          views_30d?: number | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          engagement_rate_30d?: number | null
          follower_count?: number | null
          growth_rate_30d?: number | null
          handle?: string
          id?: string
          is_visible?: boolean | null
          last_sync_at?: string | null
          platform?: Database["public"]["Enums"]["platform_name"]
          updated_at?: string | null
          verified_on_platform?: boolean | null
          views_30d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_stats_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_content: {
        Row: {
          content_id: string
          created_at: string
          id: string
          playlist_id: string
          position: number
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          playlist_id: string
          position?: number
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          playlist_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_playlist_content_content_id"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "creator_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_playlist_content_playlist_id"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "creator_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      press_mentions: {
        Row: {
          article_url: string | null
          created_at: string | null
          creator_id: string
          headline: string
          id: string
          outlet: string
          published_date: string
          sentiment_score: number | null
          updated_at: string | null
        }
        Insert: {
          article_url?: string | null
          created_at?: string | null
          creator_id: string
          headline: string
          id?: string
          outlet: string
          published_date: string
          sentiment_score?: number | null
          updated_at?: string | null
        }
        Update: {
          article_url?: string | null
          created_at?: string | null
          creator_id?: string
          headline?: string
          id?: string
          outlet?: string
          published_date?: string
          sentiment_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "press_mentions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_analytics: {
        Row: {
          base_price_per_minute: number
          booking_velocity: number | null
          competitor_avg_price: number | null
          created_at: string
          creator_id: string
          current_demand_score: number | null
          id: string
          peak_hours: Json | null
          performance_score: number | null
          surge_multiplier: number | null
          updated_at: string
        }
        Insert: {
          base_price_per_minute?: number
          booking_velocity?: number | null
          competitor_avg_price?: number | null
          created_at?: string
          creator_id: string
          current_demand_score?: number | null
          id?: string
          peak_hours?: Json | null
          performance_score?: number | null
          surge_multiplier?: number | null
          updated_at?: string
        }
        Update: {
          base_price_per_minute?: number
          booking_velocity?: number | null
          competitor_avg_price?: number | null
          created_at?: string
          creator_id?: string
          current_demand_score?: number | null
          id?: string
          peak_hours?: Json | null
          performance_score?: number | null
          surge_multiplier?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pricing_analytics_creator_id"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_payments: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          currency: string
          hold_expires_at: string | null
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          currency?: string
          hold_expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          currency?: string
          hold_expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_payments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_payments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_picture_history: {
        Row: {
          avatar_url: string
          created_at: string | null
          id: string
          is_current: boolean | null
          set_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url: string
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          set_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          set_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_privacy_settings: {
        Row: {
          created_at: string | null
          id: string
          profile_visibility: string | null
          show_avatar: boolean | null
          show_bio: boolean | null
          show_full_name: boolean | null
          show_interests: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          show_avatar?: boolean | null
          show_bio?: boolean | null
          show_full_name?: boolean | null
          show_interests?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          show_avatar?: boolean | null
          show_bio?: boolean | null
          show_full_name?: boolean | null
          show_interests?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_tags: {
        Row: {
          profile_id: string
          tag_id: number
        }
        Insert: {
          profile_id: string
          tag_id: number
        }
        Update: {
          profile_id?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_tags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          creator_only_mode: boolean | null
          full_name: string | null
          id: string
          independent_verified: boolean | null
          industry_specialization: string | null
          interests: string[] | null
          is_verified: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_only_mode?: boolean | null
          full_name?: string | null
          id: string
          independent_verified?: boolean | null
          industry_specialization?: string | null
          interests?: string[] | null
          is_verified?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_only_mode?: boolean | null
          full_name?: string | null
          id?: string
          independent_verified?: boolean | null
          industry_specialization?: string | null
          interests?: string[] | null
          is_verified?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          id: string
          promo_code_id: string
          redeemed_at: string
          skips_received: number
          user_id: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          redeemed_at?: string
          skips_received: number
          user_id: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          redeemed_at?: string
          skips_received?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_redemptions: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          metadata: Json | null
          skips_amount: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_redemptions?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          metadata?: Json | null
          skips_amount: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_redemptions?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          metadata?: Json | null
          skips_amount?: number
        }
        Relationships: []
      }
      queues: {
        Row: {
          created_at: string | null
          creator_user_id: string
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          creator_user_id: string
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          creator_user_id?: string
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          commission_rate: number | null
          created_at: string
          creator_id: string
          id: string
          is_active: boolean | null
          uses_count: number | null
        }
        Insert: {
          code: string
          commission_rate?: number | null
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean | null
          uses_count?: number | null
        }
        Update: {
          code?: string
          commission_rate?: number | null
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean | null
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referral_codes_creator_id"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_usernames: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          metadata: Json | null
          reason: string
          username: string
          verification_required: boolean | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          metadata?: Json | null
          reason: string
          username: string
          verification_required?: boolean | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          username?: string
          verification_required?: boolean | null
        }
        Relationships: []
      }
      session_invites: {
        Row: {
          created_at: string
          creator_avatar_url: string | null
          creator_name: string | null
          id: string
          invitee_id: string
          responded_at: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          creator_avatar_url?: string | null
          creator_name?: string | null
          id?: string
          invitee_id: string
          responded_at?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          creator_avatar_url?: string | null
          creator_name?: string | null
          id?: string
          invitee_id?: string
          responded_at?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_invites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "almighty_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_user_id: string
          rater_id: string
          rating: number
          session_id: string
          tags: string[] | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id: string
          rater_id: string
          rating: number
          session_id: string
          tags?: string[] | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id?: string
          rater_id?: string
          rating?: number
          session_id?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "session_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "almighty_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skips_transactions: {
        Row: {
          amount_skips: number
          created_at: string
          from_user_id: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          to_user_id: string | null
          transaction_type: string
        }
        Insert: {
          amount_skips: number
          created_at?: string
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          to_user_id?: string | null
          transaction_type: string
        }
        Update: {
          amount_skips?: number
          created_at?: string
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          to_user_id?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token: string | null
          account_created_at: string | null
          created_at: string
          follower_count: number | null
          id: string
          metadata: Json | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id: string
          platform_username: string
          refresh_token: string | null
          updated_at: string
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          access_token?: string | null
          account_created_at?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          metadata?: Json | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id: string
          platform_username: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          access_token?: string | null
          account_created_at?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_user_id?: string
          platform_username?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          ad_budget: number
          campaign_end: string | null
          campaign_start: string | null
          company_name: string
          created_at: string
          id: string
          logo_url: string | null
          status: string
          target_audience: Json | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          ad_budget?: number
          campaign_end?: string | null
          campaign_start?: string | null
          company_name: string
          created_at?: string
          id?: string
          logo_url?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          ad_budget?: number
          campaign_end?: string | null
          campaign_start?: string | null
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: number
          label: string
          slug: string
        }
        Insert: {
          id?: number
          label: string
          slug: string
        }
        Update: {
          id?: number
          label?: string
          slug?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          is_archived_creator: boolean
          is_archived_user: boolean
          last_message_at: string
          last_message_preview: string | null
          offer_id: string | null
          priority_payment_id: string | null
          type: Database["public"]["Enums"]["thread_type"]
          unread_count_creator: number
          unread_count_user: number
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          is_archived_creator?: boolean
          is_archived_user?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          offer_id?: string | null
          priority_payment_id?: string | null
          type: Database["public"]["Enums"]["thread_type"]
          unread_count_creator?: number
          unread_count_user?: number
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          is_archived_creator?: boolean
          is_archived_user?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          offer_id?: string | null
          priority_payment_id?: string | null
          type?: Database["public"]["Enums"]["thread_type"]
          unread_count_creator?: number
          unread_count_user?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_threads_offers"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_metrics: {
        Row: {
          calculated_at: string
          creator_id: string
          id: string
          press_mentions: number | null
          recent_bookings: number | null
          rising_star_score: number | null
          social_engagement: number | null
          trend_score: number | null
        }
        Insert: {
          calculated_at?: string
          creator_id: string
          id?: string
          press_mentions?: number | null
          recent_bookings?: number | null
          rising_star_score?: number | null
          social_engagement?: number | null
          trend_score?: number | null
        }
        Update: {
          calculated_at?: string
          creator_id?: string
          id?: string
          press_mentions?: number | null
          recent_bookings?: number | null
          rising_star_score?: number | null
          social_engagement?: number | null
          trend_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trend_metrics_creator_id"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balances: {
        Row: {
          balance_skips: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_skips?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_skips?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feed_preferences: {
        Row: {
          created_at: string
          followed_creators: string[] | null
          id: string
          show_creator_posts: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followed_creators?: string[] | null
          id?: string
          show_creator_posts?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          followed_creators?: string[] | null
          id?: string
          show_creator_posts?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      virtual_gifts: {
        Row: {
          amount: number
          created_at: string
          gift_type: string
          id: string
          message: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gift_type: string
          id?: string
          message?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gift_type?: string
          id?: string
          message?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      creator_ratings_summary: {
        Row: {
          average_rating: number | null
          creator_id: string | null
          negative_ratings: number | null
          positive_ratings: number | null
          recent_ratings: Json | null
          total_ratings: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      account_has_visible_content: {
        Args: { _social_account_id: string }
        Returns: boolean
      }
      calculate_onboarding_progress: {
        Args: { p_creator_id: string }
        Returns: number
      }
      check_creator_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stale_queue_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_all_queues: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_dev_session: {
        Args: { _label?: string }
        Returns: string
      }
      creator_inbox_counts: {
        Args: { p_creator_id: string }
        Returns: {
          offers_new: number
          priority_unread: number
          requests_unread: number
          standard_unread: number
        }[]
      }
      delete_creator_content: {
        Args: {
          p_content_id: string
          p_hard_delete?: boolean
          p_reason?: string
        }
        Returns: Json
      }
      ensure_skip_native_social_account: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: string
      }
      get_anonymous_ratings: {
        Args: { p_creator_id: string; p_limit?: number }
        Returns: {
          comment: string
          created_at: string
          rating: number
          tags: string[]
        }[]
      }
      get_queue_position: {
        Args: { p_creator_id: string; p_fan_id: string }
        Returns: Json
      }
      initialize_user_skips: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      mark_thread_read: {
        Args: { p_thread_id: string; p_user_id: string }
        Returns: undefined
      }
      redeem_promo_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      remove_from_queue_v1: {
        Args: { p_creator_id: string; p_fan_id: string; p_reason: string }
        Returns: Json
      }
      start_almighty_session: {
        Args: { p_queue_entry: string }
        Returns: string
      }
      transfer_skips: {
        Args: {
          p_amount_skips: number
          p_from_user_id: string
          p_metadata?: Json
          p_reference_id?: string
          p_to_user_id: string
          p_transaction_type: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_type: "fan" | "creator" | "agency" | "industry_resource"
      celebrity_tier: "A" | "B" | "C" | "Rising" | "Local Hero"
      message_type:
        | "text"
        | "attachment"
        | "system"
        | "offer_update"
        | "payment_receipt"
      offer_status:
        | "pending"
        | "accepted"
        | "declined"
        | "countered"
        | "expired"
        | "canceled"
      offer_type:
        | "live_1on1"
        | "live_group"
        | "ugc_video"
        | "social_post"
        | "story"
        | "appearance"
        | "panel"
        | "brand_collab"
      payment_status:
        | "pending"
        | "authorized"
        | "accepted"
        | "refunded"
        | "released"
        | "failed"
      platform_name:
        | "youtube"
        | "instagram"
        | "tiktok"
        | "twitter"
        | "linkedin"
        | "twitch"
        | "facebook"
        | "snapchat"
        | "pinterest"
      queue_fan_state:
        | "waiting"
        | "awaiting_consent"
        | "ready"
        | "declined"
        | "in_call"
      social_platform:
        | "twitter"
        | "instagram"
        | "youtube"
        | "tiktok"
        | "linkedin"
        | "skip_native"
      thread_type: "standard" | "priority" | "offer" | "request" | "system"
      verification_status: "pending" | "verified" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["fan", "creator", "agency", "industry_resource"],
      celebrity_tier: ["A", "B", "C", "Rising", "Local Hero"],
      message_type: [
        "text",
        "attachment",
        "system",
        "offer_update",
        "payment_receipt",
      ],
      offer_status: [
        "pending",
        "accepted",
        "declined",
        "countered",
        "expired",
        "canceled",
      ],
      offer_type: [
        "live_1on1",
        "live_group",
        "ugc_video",
        "social_post",
        "story",
        "appearance",
        "panel",
        "brand_collab",
      ],
      payment_status: [
        "pending",
        "authorized",
        "accepted",
        "refunded",
        "released",
        "failed",
      ],
      platform_name: [
        "youtube",
        "instagram",
        "tiktok",
        "twitter",
        "linkedin",
        "twitch",
        "facebook",
        "snapchat",
        "pinterest",
      ],
      queue_fan_state: [
        "waiting",
        "awaiting_consent",
        "ready",
        "declined",
        "in_call",
      ],
      social_platform: [
        "twitter",
        "instagram",
        "youtube",
        "tiktok",
        "linkedin",
        "skip_native",
      ],
      thread_type: ["standard", "priority", "offer", "request", "system"],
      verification_status: ["pending", "verified", "failed"],
    },
  },
} as const
