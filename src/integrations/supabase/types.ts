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
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "fan" | "creator" | "agency"
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
      account_type: ["fan", "creator", "agency"],
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
