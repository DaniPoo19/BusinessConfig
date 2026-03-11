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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
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

export interface ProductAddon {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  photos: string[];
  is_available: boolean;
}

export interface IncludedAddons {
  max_selections: number;
  options: ProductAddon[];
}

export interface PriceVariation {
  type: string;
  price: number;
  photo?: string;
  included_addons: IncludedAddons;
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
  available_addons: ProductAddon[];
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
