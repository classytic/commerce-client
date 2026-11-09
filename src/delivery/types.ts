export interface DeliveryRules {
  mode: "flat" | "zones";
  zones: Array<{ name: string; chargeMinor: number; districts: string[] }>;
  freeOverMinor: number | null;
}
export interface DeliverySettings {
  deliveryChargeMinor: number;
  deliveryRules: DeliveryRules;
  version: number | null;
}
export interface DeliverySettingsUpdate {
  deliveryChargeMinor: number;
  deliveryRules: DeliveryRules;
  expectedVersion: number | null;
}
export interface DeliveryDistrict {
  id: string;
  name: string;
  divisionId: string;
  divisionName: string;
}
export interface DeliveryArea {
  id: number;
  name: string;
  districtName: string;
}
export interface DeliveryQuoteInput {
  promoCode?: string;
  lines: Array<{
    productId: string;
    variantSku?: string;
    customSizing?: import("../storefront/types.js").CustomSizingInput;
    quantity: number;
  }>;
  areaId?: number;
  country?: string;
}
export interface DeliveryQuote {
  discountMinor?: number;
  taxMinor?: number;
  grandTotalMinor?: number;
  quoteToken?: string;
  promotion?: {
    appliedCodes: string[];
    rejectedCodes: Array<{ code: string; reason: string }>;
  };
  subtotalMinor: number;
  deliveryChargeMinor: number;
  currency: string;
  zone?: string;
  freeDelivery?: boolean;
}
