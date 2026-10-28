import { BaseApi } from "@classytic/arc-next/api";
import {
  createMerchantTransport,
  type MerchantClientOptions,
} from "./merchant-transport.js";
import type { ProductInput } from "./management-types.js";
import type { StorefrontBooking } from "./booking-types.js";

export interface ServiceInput
  extends Omit<
    ProductInput,
    "productType" | "inventory" | "variants" | "variationAttributes"
  > {
  productType: "service";
  inventory: { stockTracked: false };
  shipping: { requiresShipping: false };
  typeData: { durationMinutes: number; paymentMode: "pay_later" };
}
export interface MerchantService extends ServiceInput {
  _id: string;
}
export interface ScheduleWindow {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}
export interface ResourceSchedule {
  weekly: ScheduleWindow[];
  exceptions: Array<{
    date: string;
    windows: Array<{ startMinute: number; endMinute: number }>;
  }>;
}
export interface BookableResourceInput {
  code: string;
  name: string;
  productRefs: string[];
  capacityMode: "exclusive";
  slotGridMinutes: number;
  timezone: string;
  operationalStatus: "active" | "inactive";
}
export interface BookableResource extends BookableResourceInput {
  __v: number;
  _id: string;
  schedule: ResourceSchedule;
}
export type BookingOperation = "check_in" | "check_out" | "no_show" | "cancel";
export interface MerchantBooking {
  _id: string;
  reservationNumber: string;
  status: StorefrontBooking["status"];
  guestName?: string;
  metadata?: {
    serviceName?: string;
    customer?: { name: string; phone: string; email?: string };
  };
  orderNumber?: string;
  lines: Array<{
    resourceCode: string;
    productRef?: string;
    period: { start: string; end: string };
  }>;
  /** Only display operations supplied by the server; absent means read-only. */
  permittedActions?: BookingOperation[];
}

function resourceId(value: string) {
  if (!value || value === "." || value === "..")
    throw new Error("A resource identifier is required.");
  return encodeURIComponent(value);
}

/** Optional merchant booking management captures one authenticated store. */
export function createMerchantBookingsClient(options: MerchantClientOptions) {
  const client = createMerchantTransport(options);
  const config = { client, basePath: "", cache: "no-store" as const };
  const services = new BaseApi<
    MerchantService,
    ServiceInput,
    Partial<ServiceInput>
  >("products", config);
  const resources = new BaseApi<
    BookableResource,
    BookableResourceInput,
    Partial<BookableResourceInput>
  >("bookable-resources", config);
  const bookings = new BaseApi<MerchantBooking>("reservations", config);
  return {
    services,
    resources: Object.assign(resources, {
      setSchedule: (
        id: string,
        schedule: ResourceSchedule,
        expectedVersion: number,
      ) =>
        resources.request<BookableResource>(
          "POST",
          `${resources.baseUrl}/${resourceId(id)}/action`,
          { data: { action: "set_schedule", ...schedule, expectedVersion } },
        ),
    }),
    bookings: Object.assign(bookings, {
      action: (
        id: string,
        action: BookingOperation,
        idempotencyKey: string,
      ) => {
        if (
          !idempotencyKey ||
          idempotencyKey.length < 16 ||
          idempotencyKey.length > 200 ||
          idempotencyKey !== idempotencyKey.trim()
        )
          throw new Error(
            "Preserve a booking operation idempotency key for retries.",
          );
        return bookings.request<MerchantBooking>(
          "POST",
          `${bookings.baseUrl}/${resourceId(id)}/action`,
          {
            data: { action },
            options: { headerOptions: { "Idempotency-Key": idempotencyKey } },
          },
        );
      },
    }),
  };
}
