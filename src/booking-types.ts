export interface BookingService {
  id: string; slug: string; name: string; description: string; durationMinutes: number;
  price: { amount: number; currency: string };
  payment: { mode: 'none' | 'pay_later' | 'full_payment' } | { mode: 'deposit'; deposit: { amount: number; currency: string } };
}
export interface BookingServicePage {
  data: BookingService[]; page: number; limit: number; total: number; pages: number; hasNext: boolean;
}
export interface BookingServiceListOptions { page?: number; limit?: number; signal?: AbortSignal }

export interface BookingSlotQuery { serviceId: string; from: string; to: string }
export interface BookingSlots {
  service: BookingService;
  resources: Array<{ resourceRef: string; resourceName?: string; timezone: string;
    slots: Array<{ startsAt: string; endsAt: string; remaining?: number }>;
  }>;
}
export interface BookingInput {
  serviceId: string; resourceRef: string; startsAt: string;
  expectedPriceMinor: number;
  customer: { name: string; phone: string; email?: string };
}
export interface StorefrontBooking {
  id: string; reservationNumber: string; orderNumber?: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'canceled' | 'no_show' | 'expired';
  serviceId: string; serviceName: string; resourceRef: string; startsAt: string; endsAt: string;
  price: { amount: number; currency: string }; payment: 'pay_at_venue'; accessToken: string;
}
export interface BookingAccess { id: string; accessToken: string }
export interface BookingCommandOptions { idempotencyKey: string; signal?: AbortSignal }
