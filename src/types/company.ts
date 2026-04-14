// ============================================
// Company & Sale Point Management Types
// Matches backend API responses (admin endpoints)
// ============================================

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  nit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  nit?: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
  business_template?: BusinessType;
}

// ============================================
// Business Template Types
// ============================================

export type BusinessType = 'FOOD_STORE' | 'ARTICLE_STORE';

export interface BusinessTemplateConfig {
  id: BusinessType;
  name: string;
  description: string;
  icon: string;
  modules: {
    kitchen: boolean;
    delivery: boolean;
    inventory: boolean;
    metrics: boolean;
    waiter: boolean;
  };
  saleTypes: string[];
  suggestedRoles: string[];
}

/** Immutable template definitions — must match backend templates.go */
export const BUSINESS_TEMPLATES: Record<BusinessType, BusinessTemplateConfig> = {
  FOOD_STORE: {
    id: 'FOOD_STORE',
    name: 'Tienda Comidas',
    description: 'Restaurantes, heladerías, pizzerías, cafeterías. Flujo completo con cocina, toma de pedidos y domicilios.',
    icon: '🍦',
    modules: { kitchen: true, delivery: true, inventory: true, metrics: true, waiter: true },
    saleTypes: ['ON_SITE', 'PICKUP', 'DELIVERY'],
    suggestedRoles: ['owner', 'manager', 'cashier', 'waiter', 'chef', 'delivery'],
  },
  ARTICLE_STORE: {
    id: 'ARTICLE_STORE',
    name: 'Tienda Artículos',
    description: 'Minimercados, papelerías, ferreterías. Venta directa con domicilios opcionales.',
    icon: '🏪',
    modules: { kitchen: false, delivery: true, inventory: true, metrics: true, waiter: false },
    saleTypes: ['COUNTER_SALE', 'DELIVERY'],
    suggestedRoles: ['owner', 'manager', 'cashier', 'delivery'],
  },
} as const;

export interface UpdateCompanyRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  nit?: string;
}

export interface SalePoint {
  id: string;
  company_id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSalePointRequest {
  name: string;
  address?: string;
  phone?: string;
}

export interface UpdateSalePointRequest {
  name?: string;
  address?: string;
  phone?: string;
}

// ============================================
// Parameter Types
// Matches parameters collection in MongoDB
// ============================================

export interface Parameter<T = Record<string, unknown>> {
  id: string;
  company_id: string | null;
  sale_point_id: string | null;
  key: string;
  value: T;
  created_at: string;
  updated_at: string;
}

// Business Hours parameter value
export interface BusinessHoursValue {
  open_time: string;   // "08:00"
  close_time: string;  // "03:00"
  enabled: boolean;
  timezone: string;    // "America/Bogota"
}

// Delivery Cost (Barrios) parameter value
export interface DeliveryCostValue {
  data: DeliveryNeighbourhood[];
}

export interface DeliveryNeighbourhood {
  neighbourhood: string;
  price: number;
  is_active: boolean;
}

// Ingredient Categories parameter value
export interface IngredientCategoriesValue {
  groups: IngredientGroup[];
}

export interface IngredientGroup {
  type: string;  // "ADDON" | "SELECTION"
  name: string;
}

export interface CreateParameterRequest {
  key: string;
  company_id?: string;
  sale_point_id?: string;
  value: Record<string, unknown>;
}

export interface UpdateParameterRequest {
  company_id?: string;
  sale_point_id?: string;
  value: Record<string, unknown>;
}

// ============================================
// Product Types (for import feature)
// ============================================

export interface BOMIngredient {
  inventory_item_id: string;
  qty_to_deduct: number;
  unit: string;
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  photos: string[];
  is_available: boolean;
  inventory_items?: BOMIngredient[];
}

export interface CustomizationGroup {
  id: string;
  name: string;
  type: 'SELECTION' | 'ADDON';
  min_selections: number;
  max_selections: number;
  options: CustomizationOption[];
}

export interface PriceVariation {
  type: string;
  price: number;
  photo?: string;
  base_ingredients?: BOMIngredient[];
  customization_groups?: CustomizationGroup[];
  min_groups_required?: number;
}

export interface Product {
  id: string;
  company_id: string;
  sale_point_id: string;
  name: string;
  description: string;
  category: string;
  photos: string[];
  price_variations: PriceVariation[];
  is_addon?: boolean;
  is_available: boolean;
  is_unlimited_stock: boolean;
  stock: number | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Paginated Response
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// API Response Wrapper
// ============================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ============================================
// Product Import Result
// ============================================

export interface ProductImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

// ============================================
// Groups Import Result
// ============================================

export interface GroupsImportResult {
  total: number;
  updated: number;
  noMatch: number;
  failed: number;
  errors: string[];
}
