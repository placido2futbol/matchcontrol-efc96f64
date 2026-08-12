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
      callup_players: {
        Row: {
          callup_id: string
          created_at: string
          dorsal: string | null
          id: string
          photo_url: string | null
          player_name: string
          position_order: number
          status: string
        }
        Insert: {
          callup_id: string
          created_at?: string
          dorsal?: string | null
          id?: string
          photo_url?: string | null
          player_name: string
          position_order?: number
          status?: string
        }
        Update: {
          callup_id?: string
          created_at?: string
          dorsal?: string | null
          id?: string
          photo_url?: string | null
          player_name?: string
          position_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "callup_players_callup_id_fkey"
            columns: ["callup_id"]
            isOneToOne: false
            referencedRelation: "callups"
            referencedColumns: ["id"]
          },
        ]
      }
      callups: {
        Row: {
          callup_location: string | null
          callup_time: string | null
          created_at: string
          id: string
          match_date: string | null
          match_id: string | null
          match_time: string | null
          notes: string | null
          opponent: string
          season: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          callup_location?: string | null
          callup_time?: string | null
          created_at?: string
          id?: string
          match_date?: string | null
          match_id?: string | null
          match_time?: string | null
          notes?: string | null
          opponent?: string
          season?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          callup_location?: string | null
          callup_time?: string | null
          created_at?: string
          id?: string
          match_date?: string | null
          match_id?: string | null
          match_time?: string | null
          notes?: string | null
          opponent?: string
          season?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "callups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fcf_competitions: {
        Row: {
          competition_id: string | null
          competition_name: string | null
          created_at: string
          discipline_id: string | null
          fcf_season_id: number | null
          group_id: string | null
          group_name: string | null
          id: string
          internal_category: string
          last_checked_at: string | null
          season_label: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competition_id?: string | null
          competition_name?: string | null
          created_at?: string
          discipline_id?: string | null
          fcf_season_id?: number | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          internal_category: string
          last_checked_at?: string | null
          season_label: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string | null
          competition_name?: string | null
          created_at?: string
          discipline_id?: string | null
          fcf_season_id?: number | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          internal_category?: string
          last_checked_at?: string | null
          season_label?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      formulario_temporada_2026_2027: {
        Row: {
          compromisos_agosto: string | null
          continuar_equipo: string
          created_at: string
          disponible_12_agosto: string
          fecha_incorporacion: string | null
          fecha_nacimiento: string
          id: string
          motivo_no_continuar: string | null
          nombre_completo: string
          observaciones: string | null
          posicion_alternativa: string | null
          posicion_principal: string
          telefono: string
          updated_at: string
        }
        Insert: {
          compromisos_agosto?: string | null
          continuar_equipo: string
          created_at?: string
          disponible_12_agosto: string
          fecha_incorporacion?: string | null
          fecha_nacimiento: string
          id?: string
          motivo_no_continuar?: string | null
          nombre_completo: string
          observaciones?: string | null
          posicion_alternativa?: string | null
          posicion_principal: string
          telefono: string
          updated_at?: string
        }
        Update: {
          compromisos_agosto?: string | null
          continuar_equipo?: string
          created_at?: string
          disponible_12_agosto?: string
          fecha_incorporacion?: string | null
          fecha_nacimiento?: string
          id?: string
          motivo_no_continuar?: string | null
          nombre_completo?: string
          observaciones?: string | null
          posicion_alternativa?: string | null
          posicion_principal?: string
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          created_at: string
          details: string | null
          event_type: string
          id: string
          match_id: string
          minute: number
          player_name: string | null
          team_side: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          event_type: string
          id?: string
          match_id: string
          minute?: number
          player_name?: string | null
          team_side: string
        }
        Update: {
          created_at?: string
          details?: string | null
          event_type?: string
          id?: string
          match_id?: string
          minute?: number
          player_name?: string | null
          team_side?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          dorsal: string | null
          goals: number
          id: string
          is_starter: boolean
          match_id: string
          minutes_played: number
          player_name: string
          red_card: boolean
          team_side: string
          yellow_cards: number
        }
        Insert: {
          created_at?: string
          dorsal?: string | null
          goals?: number
          id?: string
          is_starter?: boolean
          match_id: string
          minutes_played?: number
          player_name: string
          red_card?: boolean
          team_side: string
          yellow_cards?: number
        }
        Update: {
          created_at?: string
          dorsal?: string | null
          goals?: number
          id?: string
          is_starter?: boolean
          match_id?: string
          minutes_played?: number
          player_name?: string
          red_card?: boolean
          team_side?: string
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number
          away_team_id: string | null
          away_team_name: string
          created_at: string
          halftime_result: string | null
          home_score: number
          home_team_id: string | null
          home_team_name: string
          id: string
          match_date: string | null
          match_time: string | null
          season: string
          status: string
          total_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          away_score?: number
          away_team_id?: string | null
          away_team_name?: string
          created_at?: string
          halftime_result?: string | null
          home_score?: number
          home_team_id?: string | null
          home_team_name?: string
          id?: string
          match_date?: string | null
          match_time?: string | null
          season?: string
          status?: string
          total_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          away_score?: number
          away_team_id?: string | null
          away_team_name?: string
          created_at?: string
          halftime_result?: string | null
          home_score?: number
          home_team_id?: string | null
          home_team_name?: string
          id?: string
          match_date?: string | null
          match_time?: string | null
          season?: string
          status?: string
          total_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          dorsal: string | null
          id: string
          name: string
          photo_url: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          dorsal?: string | null
          id?: string
          name: string
          photo_url?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          dorsal?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          fcf_season_id: number | null
          id: string
          is_active: boolean
          is_archived: boolean
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fcf_season_id?: number | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fcf_season_id?: number | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_tasks: {
        Row: {
          created_at: string
          custom_notes: string | null
          id: string
          order_index: number
          session_id: string
          task_id: string | null
          task_snapshot: Json | null
        }
        Insert: {
          created_at?: string
          custom_notes?: string | null
          id?: string
          order_index?: number
          session_id: string
          task_id?: string | null
          task_snapshot?: Json | null
        }
        Update: {
          created_at?: string
          custom_notes?: string | null
          id?: string
          order_index?: number
          session_id?: string
          task_id?: string | null
          task_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "training_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_training_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_public: boolean
          session_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_public?: boolean
          session_id: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_public?: boolean
          session_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_training_links_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tactical_boards: {
        Row: {
          created_at: string
          id: string
          name: string
          scenes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          scenes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          scenes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          crest_url: string | null
          fcf_url: string | null
          id: string
          kit_html: string | null
          kit_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crest_url?: string | null
          fcf_url?: string | null
          id?: string
          kit_html?: string | null
          kit_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crest_url?: string | null
          fcf_url?: string | null
          id?: string
          kit_html?: string | null
          kit_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          category: string | null
          coach: string | null
          created_at: string
          id: string
          is_template: boolean
          microcycle: string | null
          objective: string | null
          season: string | null
          session_date: string | null
          session_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          coach?: string | null
          created_at?: string
          id?: string
          is_template?: boolean
          microcycle?: string | null
          objective?: string | null
          season?: string | null
          session_date?: string | null
          session_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          coach?: string | null
          created_at?: string
          id?: string
          is_template?: boolean
          microcycle?: string | null
          objective?: string | null
          season?: string | null
          session_date?: string | null
          session_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_tasks: {
        Row: {
          competitiveness: string | null
          complexity: string | null
          created_at: string
          demand: string | null
          description: string | null
          didactic_form: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_favorite: boolean
          material: string | null
          name: string
          partial_time: string | null
          players_count: string | null
          repetitions: string | null
          rest_time: string | null
          space: string | null
          tags: string[]
          task_type: string | null
          theme: string | null
          total_time: string | null
          updated_at: string
          user_id: string
          work_time: string | null
        }
        Insert: {
          competitiveness?: string | null
          complexity?: string | null
          created_at?: string
          demand?: string | null
          description?: string | null
          didactic_form?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_favorite?: boolean
          material?: string | null
          name: string
          partial_time?: string | null
          players_count?: string | null
          repetitions?: string | null
          rest_time?: string | null
          space?: string | null
          tags?: string[]
          task_type?: string | null
          theme?: string | null
          total_time?: string | null
          updated_at?: string
          user_id: string
          work_time?: string | null
        }
        Update: {
          competitiveness?: string | null
          complexity?: string | null
          created_at?: string
          demand?: string | null
          description?: string | null
          didactic_form?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_favorite?: boolean
          material?: string | null
          name?: string
          partial_time?: string | null
          players_count?: string | null
          repetitions?: string | null
          rest_time?: string | null
          space?: string | null
          tags?: string[]
          task_type?: string | null
          theme?: string | null
          total_time?: string | null
          updated_at?: string
          user_id?: string
          work_time?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_training_session: { Args: { _token: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
