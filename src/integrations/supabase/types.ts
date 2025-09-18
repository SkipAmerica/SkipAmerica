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
            foreignKeyName: "fk_content_comments_parent_id"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
          comment_count: number | null
          content_type: string
          created_at: string
          description: string | null
          id: string
          like_count: number | null
          media_url: string | null
          metadata: Json | null
          platform_post_id: string
          published_at: string | null
          social_account_id: string
          thumbnail_url: string | null
          title: string | null
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          like_count?: number | null
          media_url?: string | null
          metadata?: Json | null
          platform_post_id: string
          published_at?: string | null
          social_account_id: string
          thumbnail_url?: string | null
          title?: string | null
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          like_count?: number | null
          media_url?: string | null
          metadata?: Json | null
          platform_post_id?: string
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
          is_suppressed: boolean | null
          languages: string[] | null
          last_activity_at: string | null
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
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          available_for_booking?: boolean | null
          avatar_url?: string | null
          avg_engagement_rate?: number | null
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
          is_suppressed?: boolean | null
          languages?: string[] | null
          last_activity_at?: string | null
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
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          available_for_booking?: boolean | null
          avatar_url?: string | null
          avg_engagement_rate?: number | null
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
          is_suppressed?: boolean | null
          languages?: string[] | null
          last_activity_at?: string | null
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
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      mock_creators: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          call_rate: number | null
          category: string | null
          created_at: string
          full_name: string
          id: string
          interests: string[] | null
          is_online: boolean | null
          rating: number | null
          ratings_count: number | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          call_rate?: number | null
          category?: string | null
          created_at?: string
          full_name: string
          id?: string
          interests?: string[] | null
          is_online?: boolean | null
          rating?: number | null
          ratings_count?: number | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          call_rate?: number | null
          category?: string | null
          created_at?: string
          full_name?: string
          id?: string
          interests?: string[] | null
          is_online?: boolean | null
          rating?: number | null
          ratings_count?: number | null
        }
        Relationships: []
      }
      mock_user_follows: {
        Row: {
          created_at: string
          follower_email: string
          following_creator_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_email: string
          following_creator_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_email?: string
          following_creator_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_user_follows_following_creator_id_fkey"
            columns: ["following_creator_id"]
            isOneToOne: false
            referencedRelation: "mock_creators"
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "fan" | "creator" | "agency" | "industry_resource"
      celebrity_tier: "A" | "B" | "C" | "Rising" | "Local Hero"
      offer_type:
        | "live_1on1"
        | "live_group"
        | "ugc_video"
        | "social_post"
        | "story"
        | "appearance"
        | "panel"
        | "brand_collab"
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
      social_platform:
        | "twitter"
        | "instagram"
        | "youtube"
        | "tiktok"
        | "linkedin"
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
      social_platform: [
        "twitter",
        "instagram",
        "youtube",
        "tiktok",
        "linkedin",
      ],
      verification_status: ["pending", "verified", "failed"],
    },
  },
} as const
