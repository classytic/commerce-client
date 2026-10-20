import type { Address } from '@classytic/primitives/address';
import type { Money } from '@classytic/primitives/money';

/** Public wire projections; merchant-only catalog and buyer fields are absent. */
export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categorySlug?: string;
  tags?: string[];
  collections?: string[];
  onSale?: boolean;
  images?: Array<{
    url: string; alt?: string; order?: number; isFeatured?: boolean;
    variants?: { thumbnail?: string; medium?: string };
  }>;
  monetization?: { type: 'one_time'; basePrice: Money; compareAtPrice?: Money };
  variants?: Array<{ sku: string; attributes: Record<string, string>; priceModifier: number }>;
}

export interface StorefrontCategory {
  id: string; name: string; slug: string;
  parent?: string | null;
  parentPath?: string;
  description?: string;
  image?: { url: string; alt?: string } | null;
  displayOrder?: number;
}
export interface StorefrontProductPage { data: StorefrontProduct[]; next: string | null }
export interface StorefrontProductQuery {
  limit?: number;
  /** Opaque cursor returned by the preceding page; keep filters and sort unchanged. */
  after?: string;
  category?: string;
  q?: string;
  tag?: string;
  collection?: string;
  onSale?: boolean;
  /** Inclusive base-price bounds in the store currency's integer minor units. */
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc';
}
export interface StorefrontProfile {
  organizationId: string; name: string; slug: string; status: 'active';
  currency: string; deliveryChargeMinor: number;
}

export interface GuestCheckoutInput {
  lines: Array<{ productId: string; variantSku?: string; quantity: number }>;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Address & { areaId?: number };
}

export interface StorefrontOrder {
  orderNumber: string;
  status: string;
  fulfillmentStatus?: 'unfulfilled' | 'partial' | 'fulfilled' | 'returned';
  fulfillmentSummary?: { total: number; fulfilled: number; shipped: number; delivered: number; returned: number };
  paymentTerm?: 'prepaid' | 'collect_on_delivery';
  currency: string;
  totals: {
    subtotal: Money; discount: Money; tax: Money; shipping: Money; grandTotal: Money;
    taxBasis?: 'inclusive' | 'exclusive';
  };
  createdAt: string;
  updatedAt: string;
}

export type GuestCheckoutResult = StorefrontOrder & { accessToken: string };
export interface GuestOrderAccess { orderNumber: string; accessToken: string }
export interface StorefrontRequestOptions { signal?: AbortSignal }
export interface GuestCheckoutOptions extends StorefrontRequestOptions {
  /** Create once per checkout attempt; preserve across retries and lost responses. */
  idempotencyKey: string;
}
