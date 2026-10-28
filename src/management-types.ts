import type { Money } from '@classytic/primitives/money';
import type { Address } from '@classytic/primitives/address';
import type { StorefrontOrder, StorefrontProduct } from './types.js';

export interface ProductInput {
  inventory?: { stockTracked: boolean };
  name: string;
  slug: string;
  productType: 'physical';
  status: 'draft' | 'active' | 'archived';
  description?: string;
  categorySlug?: string;
  tags?: string[];
  collections?: string[];
  images?: StorefrontProduct['images'];
  defaultMonetization: {
    type: 'one_time';
    pricing: { basePrice: Money; currency: string; compareAtPrice?: Money };
  };
  variationAttributes?: Array<{
    code: string;
    name: string;
    values: Array<{ code: string; label: string }>;
  }>;
  variantExclusions?: Array<Record<string, string>>;
  variants?: Array<{
    /** Existing server-owned stock identity; preserve when editing a variant. */
    skuRef?: string;
    sku: string;
    attributes: Record<string, string>;
    priceModifier: number;
    isActive: boolean;
  }>;
}
export interface MerchantProduct extends ProductInput {
  stock?: ProductStock;
  _id: string;
  updatedAt: string;
}
export interface CategoryInput {
  name: string;
  /** Omit on create to generate from the name. Slugs are immutable after creation. */
  slug?: string;
  parent?: string | null;
  description?: string;
  image?: { url: string; alt?: string } | null;
  bannerImage?: { url: string; alt?: string } | null;
  isActive?: boolean;
  displayOrder?: number;
}
export type CategoryUpdate = Partial<Omit<CategoryInput, 'slug'>>;
export interface MerchantCategory extends CategoryInput {
  _id: string;
  slug: string;
  parentPath?: string;
  productCount?: number;
}
export interface MerchantCategoryTree extends MerchantCategory {
  children: MerchantCategoryTree[];
  totalProductCount: number;
}
export interface CollectionInput {
  name: string;
  /** Omit to derive from the name. Permanent after creation. */
  slug?: string;
  description?: string;
  image?: { url: string; alt?: string } | null;
  isActive?: boolean;
  featured?: boolean;
  displayOrder?: number;
}
export type CollectionUpdate = Partial<Omit<CollectionInput, 'slug'>>;
export interface MerchantCollection extends CollectionInput {
  _id: string;
  /** Pass the version read by the editor to collections.update({ version }). */
  __v: number;
  slug: string;
}
export interface MerchantOrder extends StorefrontOrder {
  _id: string;
  customerSnapshot?: { name: string; phone?: string; email?: string };
  shippingAddress?: Address;
  lines: Array<{
    lineId: string;
    quantity: number;
    snapshot: { name?: string; sku?: string };
    lineTotal?: Money;
  }>;
  paymentState?: { chargeStatus: string; totalCharged?: Money };
}
export type OrderCommand =
  | { action: 'confirm' | 'start_processing' | 'ship' | 'deliver' }
  | { action: 'cancel'; reason: string };
export interface StoreSettings {
  version: number | null;
  currency: string;
  deliveryChargeMinor: number;
}
export interface MerchantMedia {
  _id: string;
  folder: string;
  size: number;
  title?: string;
  alt?: string;
  createdAt?: string;
  url: string;
  filename: string;
  mimeType?: string;
  width?: number;
  height?: number;
  variants?: Array<{ name: string; url: string; width: number; height: number; mimeType: string; size: number }>;
}

export interface IntegrationProvider {
  service: string;
  provider: string;
  label: string;
  oauth: boolean;
  credentialFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'number' | 'boolean' | 'select';
    required: boolean;
    secret?: boolean;
    placeholder?: string;
    help?: string;
    options?: Array<{ label: string; value: string }>;
  }>;
}
export interface MerchantIntegration {
  _id: string;
  service: string;
  provider: string;
  label?: string;
  enabled: boolean;
  status: 'connected' | 'disabled' | 'error';
  config: Record<string, unknown>;
  secretsSet: Record<string, boolean>;
  lastTestedAt?: string | null;
  lastTestStatus?: 'ok' | 'failed' | 'skipped';
}
export interface NotificationDelivery {
  _id: string;
  timestamp: string;
  event: string;
  status: 'delivered' | 'partial' | 'failed' | 'skipped';
  subject?: { sourceModel: string; sourceId: string };
}
export interface MerchantApiKey {
  id: string;
  kind: 'user' | 'service';
  name: string;
  prefix: string;
  ownerId: string;
  scopes: string[];
  status: 'active' | 'expired' | 'revoked';
  expiresAt: string | null;
  lastUsedAt: string | null;
  ceilingRole: string | null;
}
export interface ApiKeyOptions {
  scopes: Array<{ scope: string; requires: string[]; grantable: boolean }>;
  ceilingRoles: Array<{ role: string; scopes: string[] }>;
  can: {
    own: boolean;
    createService: boolean;
    readBranch: boolean;
    updateService: boolean;
    deleteOthers: boolean;
  };
  lifetime: { defaultDays: number; maxDays: number; allowNeverExpires?: boolean };
}
export interface ApiKeyInput {
  kind: 'user' | 'service';
  name: string;
  scopes: string[];
  /** Null explicitly requests a key that does not expire. */
  expiresInDays: number | null;
  ceilingRole?: string;
}
export interface IssuedApiKey {
  key: string;
  record: MerchantApiKey;
}

/** Inclusive start and exclusive end as ISO timestamps, at most 92 days apart. */
export interface AnalyticsWindow {
  from: string;
  to: string;
}
/** Order values include delivery charges and are independent of payment collection. */
export interface MerchantOverview {
  summary: {
    totalOrders: number;
    totalOrderValue: number;
    fulfilledOrders: number;
    fulfilledOrderValue: number;
    canceledOrders: number;
    canceledOrderValue: number;
    averageOrderValue: number;
  };
  statuses: Array<{ status: string; count: number; orderValue: number }>;
}

export interface ProductStock {
  productId: string;
  tracked: boolean;
  items: Array<{ variantSku?: string; attributes: Record<string, string>; quantity: number }>;
}
export interface StockCountInput {
  variantSku?: string;
  quantity: number;
  expectedQuantity: number;
}
export type StoreMode = 'products' | 'bookings' | 'both';
export interface StoreCapabilities {
  mode: StoreMode;
  available: { products: boolean; bookings: boolean };
  version: number | null;
}
export interface StoreCapabilitiesUpdate {
  mode: StoreMode;
  expectedVersion: number | null;
}
