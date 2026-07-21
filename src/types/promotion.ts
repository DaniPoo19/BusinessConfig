export type PromotionType =
  | 'PERCENTAGE_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'BUY_N_GET_M'
  | 'COMBO'
  | 'HAPPY_HOUR'
  | 'NTH_FREE';

export type ScopeType = 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'CATEGORIES';

export interface PromotionRules {
  discount_percent?: number;
  discount_amount?: number; // In cents
  buy_quantity?: number;
  get_quantity?: number;
  nth_free_n?: number;
  combo_price?: number; // In cents
  combo_product_ids?: string[];
  min_order_amount?: number; // In cents
  max_discount_amount?: number; // In cents
}

export interface PromotionScope {
  applies_to: ScopeType;
  product_ids?: string[];
  categories?: string[];
  exclude_ids?: string[];
}

export interface Schedule {
  days_of_week: number[]; // 0 = Sunday, etc.
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
}

export interface Promotion {
  id: string;
  company_id: string;
  sale_point_id?: string;
  name: string;
  description: string;
  type: PromotionType;
  rules: PromotionRules;
  scope: PromotionScope;
  schedule?: Schedule;
  priority: number;
  is_active: boolean;
  is_stackable: boolean;
  max_uses?: number;
  current_uses: number;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreatePromotionRequest {
  sale_point_id?: string;
  name: string;
  description: string;
  type: PromotionType;
  rules: PromotionRules;
  scope: PromotionScope;
  schedule?: Schedule;
  priority: number;
  is_active: boolean;
  is_stackable: boolean;
  max_uses?: number;
  start_date: string;
  end_date?: string;
}

export interface PromotionsImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}
