export interface CustomSizingConfig {
  unit: "in" | "cm";
  fields: Array<{
    code: string;
    label: string;
    required: boolean;
    min: number;
    max: number;
  }>;
}
export interface CustomSizingInput {
  measurements: Record<string, number>;
  note?: string;
}
export interface CustomSizingSnapshot {
  unit: "in" | "cm";
  measurements: Array<{ code: string; label: string; value: number }>;
  note?: string;
}
import type { Address } from "@classytic/primitives/address";
import type { Money } from "@classytic/primitives/money";

/** Public wire projections; merchant-only catalog and buyer fields are absent. */
export interface StorefrontProduct {
  customSizing?: CustomSizingConfig;
  stock?: {
    tracked: boolean;
    quantity?: number;
    variants?: Array<{ sku?: string; quantity: number }>;
  };
  id: string;
  name: string;
  slug: string;
  description?: string;
  categorySlug?: string;
  tags?: string[];
  collections?: string[];
  onSale?: boolean;
  images?: Array<{
    id?: string;
    url: string;
    alt?: string;
    order?: number;
    isFeatured?: boolean;
    variants?: { thumbnail?: string; medium?: string };
  }>;
  monetization?: { type: "one_time"; basePrice: Money; compareAtPrice?: Money };
  variants?: Array<{
    imageId?: string | null;
    customSizing?: boolean;
    sku: string;
    attributes: Record<string, string>;
    priceModifier: number;
  }>;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  parent?: string | null;
  parentPath?: string;
  description?: string;
  image?: { url: string; alt?: string } | null;
  bannerImage?: { url: string; alt?: string } | null;
  displayOrder?: number;
}
export interface StorefrontCollection {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: { url: string; alt?: string } | null;
  featured: boolean;
  displayOrder: number;
}
export interface StorefrontCollectionQuery {
  limit?: number;
  /** Opaque cursor; retain the same featured filter between pages. */
  after?: string;
  featured?: boolean;
}
export interface StorefrontCollectionPage {
  data: StorefrontCollection[];
  next: string | null;
}
export interface StorefrontProductPage {
  data: StorefrontProduct[];
  next: string | null;
}
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
  sort?: "newest" | "price-asc" | "price-desc";
}
export interface StorefrontProfile {
  organizationId: string;
  name: string;
  slug: string;
  status: "active";
  currency: string;
  deliveryChargeMinor: number;
}

export interface GuestCheckoutInput {
  /** Code only; discount amounts are server-owned. */
  promoCode?: string;
  /** Opaque confirmation of the reviewed server quote; retain on retries. */
  quoteToken?: string;
  lines: Array<{
    productId: string;
    variantSku?: string;
    customSizing?: CustomSizingInput;
    quantity: number;
  }>;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Address & { areaId?: number };
}

export interface StorefrontOrder {
  orderNumber: string;
  status: string;
  fulfillmentStatus?: "unfulfilled" | "partial" | "fulfilled" | "returned";
  fulfillmentSummary?: {
    total: number;
    fulfilled: number;
    shipped: number;
    delivered: number;
    returned: number;
  };
  paymentTerm?: "prepaid" | "collect_on_delivery";
  /** Recorded captures/refunds only. No provider credentials or transaction references. */
  paymentState?: {
    chargeStatus: "none" | "partial" | "full" | "overcharged";
    refundStatus?: "none" | "partial" | "full" | "over_refunded";
    totalCharged: Money;
    totalRefunded: Money;
  };
  currency: string;
  totals: {
    subtotal: Money;
    discount: Money;
    tax: Money;
    shipping: Money;
    grandTotal: Money;
    taxBasis?: "inclusive" | "exclusive";
  };
  createdAt: string;
  updatedAt: string;
}

export type GuestCheckoutResult = StorefrontOrder & { accessToken: string };
export interface GuestOrderAccess {
  orderNumber: string;
  accessToken: string;
}
export interface StorefrontRequestOptions {
  signal?: AbortSignal;
}
export interface GuestCheckoutOptions extends StorefrontRequestOptions {
  /** Create once per checkout attempt; preserve across retries and lost responses. */
  idempotencyKey: string;
}
