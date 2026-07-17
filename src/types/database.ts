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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          commune: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          marketplace_username: string | null
          notes: string | null
          region: string
          whatsapp: string
        }
        Insert: {
          address?: string | null
          commune: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          marketplace_username?: string | null
          notes?: string | null
          region: string
          whatsapp: string
        }
        Update: {
          address?: string | null
          commune?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          marketplace_username?: string | null
          notes?: string | null
          region?: string
          whatsapp?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          physical_stock: number
          reserved_stock: number
          sold_stock: number
          sticker_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          physical_stock?: number
          reserved_stock?: number
          sold_stock?: number
          sticker_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          physical_stock?: number
          reserved_stock?: number
          sold_stock?: number
          sticker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: true
            referencedRelation: "sticker_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: true
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          sticker_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty_delta: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sticker_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          qty_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sticker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "sticker_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          qty: number
          sticker_code: string
          sticker_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          qty: number
          sticker_code: string
          sticker_id: string
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          qty?: number
          sticker_code?: string
          sticker_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "sticker_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token_hash: string
          created_at: string
          customer_id: string
          delivery_method: string
          expires_at: string
          id: string
          item_count: number
          public_code: string
          reservation_id: string
          shipping_cost: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          access_token_hash: string
          created_at?: string
          customer_id: string
          delivery_method: string
          expires_at: string
          id?: string
          item_count: number
          public_code: string
          reservation_id: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          access_token_hash?: string
          created_at?: string
          customer_id?: string
          delivery_method?: string
          expires_at?: string
          id?: string
          item_count?: number
          public_code?: string
          reservation_id?: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          active: boolean
          created_at: string
          fixed_total: number | null
          id: string
          max_qty: number | null
          min_qty: number
          name: string
          price_per_unit: number | null
          priority: number
          rule_type: Database["public"]["Enums"]["pricing_rule_type"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          fixed_total?: number | null
          id?: string
          max_qty?: number | null
          min_qty: number
          name: string
          price_per_unit?: number | null
          priority?: number
          rule_type: Database["public"]["Enums"]["pricing_rule_type"]
        }
        Update: {
          active?: boolean
          created_at?: string
          fixed_total?: number | null
          id?: string
          max_qty?: number | null
          min_qty?: number
          name?: string
          price_per_unit?: number | null
          priority?: number
          rule_type?: Database["public"]["Enums"]["pricing_rule_type"]
        }
        Relationships: []
      }
      reservation_items: {
        Row: {
          id: string
          qty: number
          reservation_id: string
          sticker_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          qty: number
          reservation_id: string
          sticker_id: string
          unit_price?: number
        }
        Update: {
          id?: string
          qty?: number
          reservation_id?: string
          sticker_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_items_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_items_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "sticker_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_items_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          access_token_hash: string
          created_at: string
          customer_id: string | null
          delivery_method: string | null
          expires_at: string
          id: string
          item_count: number
          public_code: string
          shipping_cost: number
          status: Database["public"]["Enums"]["reservation_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          access_token_hash: string
          created_at?: string
          customer_id?: string | null
          delivery_method?: string | null
          expires_at: string
          id?: string
          item_count?: number
          public_code: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          access_token_hash?: string
          created_at?: string
          customer_id?: string | null
          delivery_method?: string | null
          expires_at?: string
          id?: string
          item_count?: number
          public_code?: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stickers: {
        Row: {
          code: string
          created_at: string
          display_order: number
          enabled: boolean
          id: string
          name: string | null
          number: number
          section_id: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          enabled?: boolean
          id?: string
          name?: string | null
          number?: number
          section_id: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          enabled?: boolean
          id?: string
          name?: string | null
          number?: number
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stickers_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stickers_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sticker_catalog"
            referencedColumns: ["section_id"]
          },
        ]
      }
    }
    Views: {
      sticker_catalog: {
        Row: {
          available_qty: number | null
          code: string | null
          display_order: number | null
          enabled: boolean | null
          id: string | null
          inventory_updated_at: string | null
          name: string | null
          number: number | null
          physical_stock: number | null
          reserved_stock: number | null
          section_code: string | null
          section_id: string | null
          section_name: string | null
          section_sort_order: number | null
          sold_stock: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_inventory: {
        Args: {
          p_admin_id: string
          p_comment?: string
          p_new_physical: number
          p_reason: string
          p_sticker_id: string
        }
        Returns: Json
      }
      adjust_inventory_delta: {
        Args: {
          p_admin_id: string
          p_comment?: string
          p_delta: number
          p_reason: string
          p_sticker_id: string
        }
        Returns: Json
      }
      calculate_order_pricing: {
        Args: { p_qty: number }
        Returns: {
          is_promo: boolean
          rule_name: string
          subtotal: number
        }[]
      }
      calculate_shipping_cost: {
        Args: { p_method: string; p_qty: number }
        Returns: number
      }
      cancel_order: {
        Args: { p_admin_id: string; p_order_id: string; p_reason?: string }
        Returns: Json
      }
      complete_checkout: {
        Args: {
          p_access_token_hash: string
          p_customer: Json
          p_delivery_method: string
          p_reservation_id: string
        }
        Returns: Json
      }
      confirm_payment: {
        Args: { p_admin_id: string; p_order_id: string }
        Returns: Json
      }
      create_reservation: {
        Args: { p_access_token_hash: string; p_items: Json }
        Returns: Json
      }
      expire_reservations: { Args: never; Returns: number }
      generate_public_code: { Args: { prefix?: string }; Returns: string }
      get_setting: { Args: { p_default?: Json; p_key: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      sync_full_catalog: { Args: never; Returns: Json }
    }
    Enums: {
      movement_type: "reserve" | "release" | "sale" | "adjustment" | "restock"
      order_status:
        | "awaiting_payment"
        | "payment_reported"
        | "paid"
        | "delivered"
        | "cancelled"
        | "expired"
      pricing_rule_type: "tier" | "fixed_exact"
      reservation_status:
        | "reserved"
        | "awaiting_payment"
        | "expired"
        | "cancelled"
        | "converted"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      movement_type: ["reserve", "release", "sale", "adjustment", "restock"],
      order_status: [
        "awaiting_payment",
        "payment_reported",
        "paid",
        "delivered",
        "cancelled",
        "expired",
      ],
      pricing_rule_type: ["tier", "fixed_exact"],
      reservation_status: [
        "reserved",
        "awaiting_payment",
        "expired",
        "cancelled",
        "converted",
      ],
    },
  },
} as const
