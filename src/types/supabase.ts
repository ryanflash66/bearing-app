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
          created_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_role?: string
          created_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_role?: string
          created_at?: string
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
      users: {
        Row: {
          auth_id: string
          created_at: string
          display_name: string | null
          email: string
          id: string
          pen_name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          auth_id: string
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          pen_name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          pen_name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_word_count: { Args: { content: string }; Returns: number }
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
      process_billing_cycle: {
        Args: { target_account_id: string }
        Returns: Json
      }
    }
    Enums: {
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
      usage_status_type: ["good_standing", "flagged", "upsell_required"],
    },
  },
} as const
