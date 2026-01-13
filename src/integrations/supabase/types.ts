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
      accounts: {
        Row: {
          balance: number
          created_at: string
          equity: number
          id: string
          max_drawdown_pct: number
          participant_id: string
          peak_equity: number
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          used_margin: number
        }
        Insert: {
          balance?: number
          created_at?: string
          equity?: number
          id?: string
          max_drawdown_pct?: number
          participant_id: string
          peak_equity?: number
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          used_margin?: number
        }
        Update: {
          balance?: number
          created_at?: string
          equity?: number
          id?: string
          max_drawdown_pct?: number
          participant_id?: string
          peak_equity?: number
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          used_margin?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "competition_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_instruments: {
        Row: {
          competition_id: string
          created_at: string
          instrument_id: string
          leverage_max_override: number | null
          max_notional_override: number | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          instrument_id: string
          leverage_max_override?: number | null
          max_notional_override?: number | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          instrument_id?: string
          leverage_max_override?: number | null
          max_notional_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_instruments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_instruments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_participants: {
        Row: {
          competition_id: string
          id: string
          joined_at: string
          status: Database["public"]["Enums"]["participant_status"]
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["participant_status"]
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["participant_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_rules: {
        Row: {
          allow_weekend_trading: boolean
          competition_id: string
          created_at: string
          id: string
          max_drawdown_pct: number
          max_leverage_global: number
          max_position_pct: number
          min_trades: number
          starting_balance: number
        }
        Insert: {
          allow_weekend_trading?: boolean
          competition_id: string
          created_at?: string
          id?: string
          max_drawdown_pct?: number
          max_leverage_global?: number
          max_position_pct?: number
          min_trades?: number
          starting_balance?: number
        }
        Update: {
          allow_weekend_trading?: boolean
          competition_id?: string
          created_at?: string
          id?: string
          max_drawdown_pct?: number
          max_leverage_global?: number
          max_position_pct?: number
          min_trades?: number
          starting_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_rules_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: true
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          entry_fee: number
          id: string
          max_participants: number | null
          name: string
          prize_pool: number
          starts_at: string
          status: Database["public"]["Enums"]["competition_status"]
          updated_at: string
          winner_distribution: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          entry_fee?: number
          id?: string
          max_participants?: number | null
          name: string
          prize_pool?: number
          starts_at: string
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
          winner_distribution?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          entry_fee?: number
          id?: string
          max_participants?: number | null
          name?: string
          prize_pool?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["competition_status"]
          updated_at?: string
          winner_distribution?: Json | null
        }
        Relationships: []
      }
      disqualifications: {
        Row: {
          account_id: string
          competition_id: string
          id: string
          reason: string
          triggered_at: string
        }
        Insert: {
          account_id: string
          competition_id: string
          id?: string
          reason: string
          triggered_at?: string
        }
        Update: {
          account_id?: string
          competition_id?: string
          id?: string
          reason?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disqualifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disqualifications_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_snapshots: {
        Row: {
          account_id: string
          balance: number
          equity: number
          id: string
          max_drawdown_pct_so_far: number
          ts: string
          unrealized_pnl: number
        }
        Insert: {
          account_id: string
          balance: number
          equity: number
          id?: string
          max_drawdown_pct_so_far?: number
          ts?: string
          unrealized_pnl?: number
        }
        Update: {
          account_id?: string
          balance?: number
          equity?: number
          id?: string
          max_drawdown_pct_so_far?: number
          ts?: string
          unrealized_pnl?: number
        }
        Relationships: [
          {
            foreignKeyName: "equity_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          base_currency: string | null
          contract_size: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          quantity_type: Database["public"]["Enums"]["quantity_type"]
          quote_currency: string | null
          symbol: string
          tick_size: number
          tv_symbol: string
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          base_currency?: string | null
          contract_size?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          quantity_type?: Database["public"]["Enums"]["quantity_type"]
          quote_currency?: string | null
          symbol: string
          tick_size?: number
          tv_symbol: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          base_currency?: string | null
          contract_size?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          quantity_type?: Database["public"]["Enums"]["quantity_type"]
          quote_currency?: string | null
          symbol?: string
          tick_size?: number
          tv_symbol?: string
        }
        Relationships: []
      }
      market_candles: {
        Row: {
          close: number
          high: number
          id: string
          instrument_id: string
          low: number
          open: number
          source: string
          timeframe: string
          ts_open: string
          volume: number | null
        }
        Insert: {
          close: number
          high: number
          id?: string
          instrument_id: string
          low: number
          open: number
          source?: string
          timeframe?: string
          ts_open: string
          volume?: number | null
        }
        Update: {
          close?: number
          high?: number
          id?: string
          instrument_id?: string
          low?: number
          open?: number
          source?: string
          timeframe?: string
          ts_open?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_candles_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices_latest: {
        Row: {
          ask: number
          bid: number
          instrument_id: string
          price: number
          source: string
          ts: string
        }
        Insert: {
          ask: number
          bid: number
          instrument_id: string
          price: number
          source?: string
          ts?: string
        }
        Update: {
          ask?: number
          bid?: number
          instrument_id?: string
          price?: number
          source?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_latest_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: true
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_id: string
          filled_at: string | null
          filled_price: number | null
          id: string
          instrument_id: string
          leverage: number
          margin_used: number | null
          order_type: Database["public"]["Enums"]["order_type"]
          quantity: number
          requested_at: string
          requested_price: number | null
          side: Database["public"]["Enums"]["order_side"]
          status: Database["public"]["Enums"]["order_status"]
          stop_loss: number | null
          take_profit: number | null
        }
        Insert: {
          account_id: string
          filled_at?: string | null
          filled_price?: number | null
          id?: string
          instrument_id: string
          leverage?: number
          margin_used?: number | null
          order_type?: Database["public"]["Enums"]["order_type"]
          quantity: number
          requested_at?: string
          requested_price?: number | null
          side: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          stop_loss?: number | null
          take_profit?: number | null
        }
        Update: {
          account_id?: string
          filled_at?: string | null
          filled_price?: number | null
          id?: string
          instrument_id?: string
          leverage?: number
          margin_used?: number | null
          order_type?: Database["public"]["Enums"]["order_type"]
          quantity?: number
          requested_at?: string
          requested_price?: number | null
          side?: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["order_status"]
          stop_loss?: number | null
          take_profit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          account_id: string
          closed_at: string | null
          current_price: number | null
          entry_price: number
          id: string
          instrument_id: string
          leverage: number
          margin_used: number
          opened_at: string
          quantity: number
          realized_pnl: number
          side: Database["public"]["Enums"]["order_side"]
          status: Database["public"]["Enums"]["position_status"]
          stop_loss: number | null
          take_profit: number | null
          unrealized_pnl: number
        }
        Insert: {
          account_id: string
          closed_at?: string | null
          current_price?: number | null
          entry_price: number
          id?: string
          instrument_id: string
          leverage?: number
          margin_used: number
          opened_at?: string
          quantity: number
          realized_pnl?: number
          side: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["position_status"]
          stop_loss?: number | null
          take_profit?: number | null
          unrealized_pnl?: number
        }
        Update: {
          account_id?: string
          closed_at?: string | null
          current_price?: number | null
          entry_price?: number
          id?: string
          instrument_id?: string
          leverage?: number
          margin_used?: number
          opened_at?: string
          quantity?: number
          realized_pnl?: number
          side?: Database["public"]["Enums"]["order_side"]
          status?: Database["public"]["Enums"]["position_status"]
          stop_loss?: number | null
          take_profit?: number | null
          unrealized_pnl?: number
        }
        Relationships: [
          {
            foreignKeyName: "positions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rank_snapshots: {
        Row: {
          account_id: string
          competition_id: string
          id: string
          max_drawdown_pct: number
          profit_pct: number
          rank: number
          score: number
          ts: string
        }
        Insert: {
          account_id: string
          competition_id: string
          id?: string
          max_drawdown_pct: number
          profit_pct: number
          rank: number
          score: number
          ts?: string
        }
        Update: {
          account_id?: string
          competition_id?: string
          id?: string
          max_drawdown_pct?: number
          profit_pct?: number
          rank?: number
          score?: number
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_snapshots_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          closed_at: string
          entry_price: number
          exit_price: number
          id: string
          instrument_id: string
          opened_at: string
          position_id: string | null
          quantity: number
          realized_pnl: number
          side: Database["public"]["Enums"]["order_side"]
        }
        Insert: {
          account_id: string
          closed_at?: string
          entry_price: number
          exit_price: number
          id?: string
          instrument_id: string
          opened_at: string
          position_id?: string | null
          quantity: number
          realized_pnl: number
          side: Database["public"]["Enums"]["order_side"]
        }
        Update: {
          account_id?: string
          closed_at?: string
          entry_price?: number
          exit_price?: number
          id?: string
          instrument_id?: string
          opened_at?: string
          position_id?: string | null
          quantity?: number
          realized_pnl?: number
          side?: Database["public"]["Enums"]["order_side"]
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_accounts: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_account_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_account_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      withdraw_requests: {
        Row: {
          amount: number
          id: string
          method: string
          processed_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdraw_status"]
          wallet_account_id: string
        }
        Insert: {
          amount: number
          id?: string
          method?: string
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdraw_status"]
          wallet_account_id: string
        }
        Update: {
          amount?: number
          id?: string
          method?: string
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdraw_status"]
          wallet_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdraw_requests_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "frozen" | "closed"
      app_role: "user" | "admin"
      asset_class: "forex" | "indices" | "commodities" | "crypto" | "stocks"
      competition_status:
        | "draft"
        | "upcoming"
        | "live"
        | "paused"
        | "ended"
        | "cancelled"
      order_side: "buy" | "sell"
      order_status: "pending" | "filled" | "cancelled" | "rejected"
      order_type: "market" | "limit" | "stop"
      participant_status: "active" | "disqualified" | "withdrawn"
      position_status: "open" | "closed" | "liquidated"
      quantity_type: "lots" | "contracts" | "shares" | "units"
      wallet_tx_status: "pending" | "completed" | "failed" | "cancelled"
      wallet_tx_type:
        | "deposit"
        | "withdrawal"
        | "entry_fee"
        | "prize"
        | "refund"
      withdraw_status: "pending" | "approved" | "rejected" | "completed"
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
      account_status: ["active", "frozen", "closed"],
      app_role: ["user", "admin"],
      asset_class: ["forex", "indices", "commodities", "crypto", "stocks"],
      competition_status: [
        "draft",
        "upcoming",
        "live",
        "paused",
        "ended",
        "cancelled",
      ],
      order_side: ["buy", "sell"],
      order_status: ["pending", "filled", "cancelled", "rejected"],
      order_type: ["market", "limit", "stop"],
      participant_status: ["active", "disqualified", "withdrawn"],
      position_status: ["open", "closed", "liquidated"],
      quantity_type: ["lots", "contracts", "shares", "units"],
      wallet_tx_status: ["pending", "completed", "failed", "cancelled"],
      wallet_tx_type: ["deposit", "withdrawal", "entry_fee", "prize", "refund"],
      withdraw_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
