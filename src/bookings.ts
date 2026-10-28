import type { BaseApi } from '@classytic/arc-next/api';
import type { BookingAccess, BookingCommandOptions, BookingInput, BookingServicePage, BookingServiceListOptions, BookingSlotQuery, BookingSlots, StorefrontBooking } from './booking-types.js';

/** Guest booking operations use the isolated storefront client, never merchant credentials. */
export function createStorefrontBookings(api: BaseApi) {
  const root = `${api.baseUrl}/bookings`;
  function key(options: BookingCommandOptions) {
    if (!options?.idempotencyKey || options.idempotencyKey.length < 16 || options.idempotencyKey.length > 200 || options.idempotencyKey !== options.idempotencyKey.trim()) {
      throw new Error('Preserve an idempotencyKey of 16–200 characters for booking retries.');
    }
    return options.idempotencyKey;
  }
  function access(value: BookingAccess) {
    if (!/^[a-f0-9]{24}$/.test(value.id) || !value.accessToken.trim()) throw new Error('Booking access is required.');
    return `${root}/${encodeURIComponent(value.id)}`;
  }
  const servicesPage = ({ page, limit, signal }: BookingServiceListOptions = {}) => {
    const params = { ...(page !== undefined ? { page } : {}), ...(limit !== undefined ? { limit } : {}) };
    return api.request<BookingServicePage>('GET', `${root}/services`, {
      ...(page !== undefined || limit !== undefined ? { params } : {}), options: { signal },
    });
  };
  return {
    servicesPage,
    async services(options: BookingServiceListOptions = {}) {
      return (await servicesPage(options)).data;
    },
    slots: (query: BookingSlotQuery, options: { signal?: AbortSignal } = {}) => api.request<BookingSlots>('GET', `${root}/slots`, { params: { ...query }, options }),
    create: (input: BookingInput, options: BookingCommandOptions) => api.request<StorefrontBooking>('POST', root, {
      data: input, options: { signal: options.signal, headerOptions: { 'Idempotency-Key': key(options) } },
    }),
    read: (value: BookingAccess, options: { signal?: AbortSignal } = {}) => api.request<StorefrontBooking>('GET', access(value), {
      options: { ...options, headerOptions: { 'x-order-access': value.accessToken } },
    }),
    cancel: (value: BookingAccess, options: BookingCommandOptions) => api.request<StorefrontBooking>('POST', `${access(value)}/cancel`, {
      data: {}, options: { signal: options.signal, headerOptions: { 'x-order-access': value.accessToken, 'Idempotency-Key': key(options) } },
    }),
  };
}
