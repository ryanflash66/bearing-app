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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_members: {
        Row: {
          account_id: string
          account_role: string
          ai_status: string
          created_at: string
          internal_note: string | null
          member_status: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_role?: string
          ai_status?: string
          created_at?: string
          internal_note?: string | null
          member_status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_role?: string
          ai_status?: string
          created_at?: string
          internal_note?: string | null
          member_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          consecutive_overage_months: number
          created_at: string
          id: string
          name: string
          owner_user_id: string
          usage_status: Database["public"]["Enums"]["usage_status_type"]
        }
        Insert: {
          consecutive_overage_months?: number
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          usage_status?: Database["public"]["Enums"]["usage_status_type"]
        }
        Update: {
          consecutive_overage_months?: number
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          usage_status?: Database["public"]["Enums"]["usage_status_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          account_id: string
          created_at: string
          cycle_id: string | null
          feature: string
          id: string
          latency_ms: number | null
          model: string
          tokens_actual: number | null
          tokens_estimated: number
          user_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          cycle_id?: string | null
          feature: string
          id?: string
          latency_ms?: number | null
          model: string
          tokens_actual?: number | null
          tokens_estimated?: number
          user_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          cycle_id?: string | null
          feature?: string
          id?: string
          latency_ms?: number | null
          model?: string
          tokens_actual?: number | null
          tokens_estimated?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "user_current_usage"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "ai_usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          account_id: string
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          account_id: string
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          account_id?: string
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_cycles: {
        Row: {
          account_id: string
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_cycles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      consistency_checks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          input_hash: string
          manuscript_id: string
          model: string
          report_json: Json | null
          status: string
          tokens_actual: number
          tokens_estimated: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          input_hash: string
          manuscript_id: string
          model?: string
          report_json?: Json | null
          status?: string
          tokens_actual?: number
          tokens_estimated?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          input_hash?: string
          manuscript_id?: string
          model?: string
          report_json?: Json | null
          status?: string
          tokens_actual?: number
          tokens_estimated?: number
        }
        Relationships: [
          {
            foreignKeyName: "consistency_checks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consistency_checks_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      isbn_pool: {
        Row: {
          assigned_at: string | null
          assigned_to_request_id: string | null
          created_at: string
          id: string
          isbn: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to_request_id?: string | null
          created_at?: string
          id?: string
          isbn: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to_request_id?: string | null
          created_at?: string
          id?: string
          isbn?: string
        }
        Relationships: [
          {
            foreignKeyName: "isbn_pool_assigned_to_request_id_fkey"
            columns: ["assigned_to_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      manuscript_versions: {
        Row: {
          content_json: Json
          content_text: string
          created_at: string
          created_by: string | null
          id: string
          manuscript_id: string
          title: string
          version_num: number
        }
        Insert: {
          content_json: Json
          content_text: string
          created_at?: string
          created_by?: string | null
          id?: string
          manuscript_id: string
          title: string
          version_num: number
        }
        Update: {
          content_json?: Json
          content_text?: string
          created_at?: string
          created_by?: string | null
          id?: string
          manuscript_id?: string
          title?: string
          version_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "manuscript_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manuscript_versions_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      manuscripts: {
        Row: {
          account_id: string
          content_hash: string | null
          content_json: Json
          content_text: string
          created_at: string
          deleted_at: string | null
          id: string
          last_saved_at: string | null
          owner_user_id: string
          status: string
          title: string
          updated_at: string
          word_count: number
        }
        Insert: {
          account_id: string
          content_hash?: string | null
          content_json?: Json
          content_text?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_saved_at?: string | null
          owner_user_id: string
          status?: string
          title?: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          account_id?: string
          content_hash?: string | null
          content_json?: Json
          content_text?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_saved_at?: string | null
          owner_user_id?: string
          status?: string
          title?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "manuscripts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manuscripts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          auth_user_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          manuscript_id: string | null
          metadata: Json | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["service_request_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          manuscript_id?: string | null
          metadata?: Json | null
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_request_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          manuscript_id?: string | null
          metadata?: Json | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_request_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          confidence: number
          created_at: string
          created_by: string
          id: string
          instruction: string | null
          manuscript_id: string
          model: string
          original_text: string
          request_hash: string
          suggested_text: string
          tokens_actual: number
          tokens_estimated: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          created_by: string
          id?: string
          instruction?: string | null
          manuscript_id: string
          model?: string
          original_text: string
          request_hash: string
          suggested_text: string
          tokens_actual?: number
          tokens_estimated?: number
        }
        Update: {
          confidence?: number
          created_at?: string
          created_by?: string
          id?: string
          instruction?: string | null
          manuscript_id?: string
          model?: string
          original_text?: string
          request_hash?: string
          suggested_text?: string
          tokens_actual?: number
          tokens_estimated?: number
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_user_id: string
          ticket_id: string
          ticket_owner_auth_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_user_id: string
          ticket_id: string
          ticket_owner_auth_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_user_id?: string
          ticket_id?: string
          ticket_owner_auth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_id: string
          created_at: string
          display_name: string | null
          email: string
          id: string
          pen_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          auth_id: string
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          pen_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          pen_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_current_usage: {
        Row: {
          account_id: string | null
          cycle_id: string | null
          cycle_start: string | null
          last_activity: string | null
          total_checks: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_cycles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_word_count: { Args: { content: string }; Returns: number }
      claim_profile: {
        Args: { p_auth_id: string; p_email: string }
        Returns: {
          auth_id: string
          created_at: string
          display_name: string
          email: string
          id: string
          pen_name: string
          role: string
          updated_at: string
        }[]
      }
      claim_ticket: { Args: { ticket_id: string }; Returns: undefined }
      create_default_account: {
        Args: { p_name: string; p_owner_id: string }
        Returns: {
          consecutive_overage_months: number
          created_at: string
          id: string
          name: string
          owner_user_id: string
          usage_status: Database["public"]["Enums"]["usage_status_type"]
        }[]
      }
      create_ticket: {
        Args: {
          message: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          subject: string
        }
        Returns: string
      }
      get_available_isbn_count: { Args: never; Returns: number }
      get_current_user_id: { Args: never; Returns: string }
      get_user_account_ids: { Args: never; Returns: string[] }
      is_account_admin: { Args: { check_account_id: string }; Returns: boolean }
      is_account_admin_or_owner: {
        Args: { check_account_id: string }
        Returns: boolean
      }
      is_account_member: {
        Args: { check_account_id: string }
        Returns: boolean
      }
      is_account_support: {
        Args: { check_account_id: string }
        Returns: boolean
      }
      is_platform_support: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_support_agent: { Args: never; Returns: boolean }
      process_billing_cycle: {
        Args: { target_account_id: string }
        Returns: Json
      }
      recover_stale_jobs: {
        Args: { timeout_minutes?: number }
        Returns: {
          failed_count: number
          job_ids: string[]
        }[]
      }
      reply_to_ticket: {
        Args: { content: string; ticket_id: string }
        Returns: undefined
      }
      update_ticket_status: {
        Args: {
          new_status: Database["public"]["Enums"]["support_ticket_status"]
          ticket_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin" | "support_agent" | "super_admin"
      service_request_status:
        | "pending"
        | "paid"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "failed"
      service_type:
        | "isbn"
        | "cover_design"
        | "editing"
        | "author_website"
        | "marketing"
        | "social_media"
        | "publishing_help"
        | "printing"
      support_ticket_status:
        | "open"
        | "pending_user"
        | "pending_support"
        | "resolved"
      ticket_priority: "low" | "medium" | "high" | "critical"
      usage_status_type: "good_standing" | "flagged" | "upsell_required"
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
      app_role: ["user", "admin", "support_agent", "super_admin"],
      service_request_status: [
        "pending",
        "paid",
        "in_progress",
        "completed",
        "cancelled",
        "failed",
      ],
      service_type: [
        "isbn",
        "cover_design",
        "editing",
        "author_website",
        "marketing",
        "social_media",
        "publishing_help",
        "printing",
      ],
      support_ticket_status: [
        "open",
        "pending_user",
        "pending_support",
        "resolved",
      ],
      ticket_priority: ["low", "medium", "high", "critical"],
      usage_status_type: ["good_standing", "flagged", "upsell_required"],
    },
  },
} as const
