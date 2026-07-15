/**
 * Database types for the marketplace schema (public schema).
 *
 * Bootstrapped by hand from supabase/migrations to match the live schema.
 * To regenerate automatically once a Supabase access token is available,
 * run `npm run gen:types` (see scripts/gen-types.sh).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["user_status"];
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["user_status"];
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["user_status"];
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      seller_applications: {
        Row: {
          id: string;
          user_id: string;
          shop_name: string;
          id_card_number: string | null;
          id_card_url: string | null;
          extra_doc_url: string | null;
          phone: string | null;
          address: string | null;
          status: Database["public"]["Enums"]["application_status"];
          reject_reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_name: string;
          id_card_number?: string | null;
          id_card_url?: string | null;
          extra_doc_url?: string | null;
          phone?: string | null;
          address?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          reject_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          shop_name?: string;
          id_card_number?: string | null;
          id_card_url?: string | null;
          extra_doc_url?: string | null;
          phone?: string | null;
          address?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          reject_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shops: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          banner_url: string | null;
          promptpay_id: string | null;
          status: Database["public"]["Enums"]["shop_status"];
          suspend_reason: string | null;
          rating_avg: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          promptpay_id?: string | null;
          status?: Database["public"]["Enums"]["shop_status"];
          suspend_reason?: string | null;
          rating_avg?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          promptpay_id?: string | null;
          status?: Database["public"]["Enums"]["shop_status"];
          suspend_reason?: string | null;
          rating_avg?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_warnings: {
        Row: {
          id: string;
          shop_id: string;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          reason?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_warnings_shop_id_fkey";
            columns: ["shop_id"];
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          requires_size: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          requires_size?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          requires_size?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string;
          name: string;
          slug: string | null;
          description: string | null;
          price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          category_id: string;
          name: string;
          slug?: string | null;
          description?: string | null;
          price: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          category_id?: string;
          name?: string;
          slug?: string | null;
          description?: string | null;
          price?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey";
            columns: ["shop_id"];
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          price: number | null;
          stock: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name?: string;
          sku?: string | null;
          price?: number | null;
          stock?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          sku?: string | null;
          price?: number | null;
          stock?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          is_primary: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          recipient_name: string;
          phone: string;
          line1: string;
          sub_district: string | null;
          district: string | null;
          province: string;
          postal_code: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient_name: string;
          phone: string;
          line1: string;
          sub_district?: string | null;
          district?: string | null;
          province: string;
          postal_code: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient_name?: string;
          phone?: string;
          line1?: string;
          sub_district?: string | null;
          district?: string | null;
          province?: string;
          postal_code?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          variant_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          id: string;
          shop_id: string;
          code: string;
          type: Database["public"]["Enums"]["coupon_type"];
          value: number;
          min_order: number;
          usage_limit: number | null;
          used_count: number;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          code: string;
          type: Database["public"]["Enums"]["coupon_type"];
          value: number;
          min_order?: number;
          usage_limit?: number | null;
          used_count?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          code?: string;
          type?: Database["public"]["Enums"]["coupon_type"];
          value?: number;
          min_order?: number;
          usage_limit?: number | null;
          used_count?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupons_shop_id_fkey";
            columns: ["shop_id"];
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_no: string;
          checkout_group_id: string;
          buyer_id: string;
          shop_id: string;
          status: Database["public"]["Enums"]["order_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          coupon_id: string | null;
          coupon_code: string | null;
          subtotal: number;
          discount: number;
          shipping_fee: number;
          total: number;
          ship_recipient: string;
          ship_phone: string;
          ship_line1: string;
          ship_sub_district: string | null;
          ship_district: string | null;
          ship_province: string;
          ship_postal_code: string;
          carrier: string | null;
          tracking_no: string | null;
          cancel_reason: string | null;
          cancelled_by: string | null;
          created_at: string;
          updated_at: string;
          paid_at: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          order_no: string;
          checkout_group_id: string;
          buyer_id: string;
          shop_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          coupon_id?: string | null;
          coupon_code?: string | null;
          subtotal?: number;
          discount?: number;
          shipping_fee?: number;
          total?: number;
          ship_recipient: string;
          ship_phone: string;
          ship_line1: string;
          ship_sub_district?: string | null;
          ship_district?: string | null;
          ship_province: string;
          ship_postal_code: string;
          carrier?: string | null;
          tracking_no?: string | null;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
        };
        Update: {
          id?: string;
          order_no?: string;
          checkout_group_id?: string;
          buyer_id?: string;
          shop_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          coupon_id?: string | null;
          coupon_code?: string | null;
          subtotal?: number;
          discount?: number;
          shipping_fee?: number;
          total?: number;
          ship_recipient?: string;
          ship_phone?: string;
          ship_line1?: string;
          ship_sub_district?: string | null;
          ship_district?: string | null;
          ship_province?: string;
          ship_postal_code?: string;
          carrier?: string | null;
          tracking_no?: string | null;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey";
            columns: ["shop_id"];
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name: string;
          variant_name: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name: string;
          variant_name: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name?: string;
          variant_name?: string;
          unit_price?: number;
          quantity?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          note: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          method: Database["public"]["Enums"]["payment_method"];
          amount: number;
          status: Database["public"]["Enums"]["payment_status"];
          slip_url: string | null;
          promptpay_payload: string | null;
          submitted_at: string | null;
          verified_at: string | null;
          verified_by: string | null;
          reject_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          method: Database["public"]["Enums"]["payment_method"];
          amount: number;
          status?: Database["public"]["Enums"]["payment_status"];
          slip_url?: string | null;
          promptpay_payload?: string | null;
          submitted_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          reject_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          amount?: number;
          status?: Database["public"]["Enums"]["payment_status"];
          slip_url?: string | null;
          promptpay_payload?: string | null;
          submitted_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          reject_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          order_item_id: string;
          product_id: string;
          shop_id: string;
          buyer_id: string;
          rating: number;
          comment: string | null;
          image_urls: string[];
          seller_reply: string | null;
          seller_replied_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          product_id: string;
          shop_id: string;
          buyer_id: string;
          rating: number;
          comment?: string | null;
          image_urls?: string[];
          seller_reply?: string | null;
          seller_replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_item_id?: string;
          product_id?: string;
          shop_id?: string;
          buyer_id?: string;
          rating?: number;
          comment?: string | null;
          image_urls?: string[];
          seller_reply?: string | null;
          seller_replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_item_id_fkey";
            columns: ["order_item_id"];
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_shop_id_fkey";
            columns: ["shop_id"];
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          detail?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          detail?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      current_user_role: {
        Args: Record<never, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      owns_shop: {
        Args: { p_shop_id: string };
        Returns: boolean;
      };
      approve_seller_application: {
        Args: { p_application_id: string };
        Returns: undefined;
      };
      reject_seller_application: {
        Args: { p_application_id: string; p_reason: string };
        Returns: undefined;
      };
      set_user_status: {
        Args: {
          p_user_id: string;
          p_status: Database["public"]["Enums"]["user_status"];
        };
        Returns: undefined;
      };
      promote_to_admin: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      place_order: {
        Args: {
          p_address_id: string;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
        };
        Returns: { checkout_group_id: string; order_ids: string[] }[];
      };
      cancel_order: {
        Args: { p_order_id: string; p_reason: string };
        Returns: undefined;
      };
      update_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: Database["public"]["Enums"]["order_status"];
          p_carrier?: string | null;
          p_tracking_no?: string | null;
        };
        Returns: undefined;
      };
      confirm_order_received: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      submit_payment_slip: {
        Args: { p_order_id: string; p_slip_path: string };
        Returns: undefined;
      };
      verify_payment_slip: {
        Args: { p_order_id: string; p_approve: boolean; p_reason?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "buyer" | "seller" | "admin";
      user_status: "active" | "banned";
      application_status: "pending" | "approved" | "rejected";
      shop_status: "active" | "suspended";
      order_status:
        | "awaiting_payment"
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled";
      payment_method: "cod" | "promptpay";
      payment_status: "unpaid" | "submitted" | "verified" | "rejected";
      coupon_type: "percent" | "amount";
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
