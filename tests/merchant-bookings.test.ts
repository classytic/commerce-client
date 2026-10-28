import { expect, it, vi } from "vitest";
import { createMerchantBookingsClient } from "../src/merchant-bookings.js";
it("scopes merchant service, schedule and lifecycle requests to the captured store", async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({ data: [], hasNext: false }),
  );
  const client = createMerchantBookingsClient({
    apiUrl: "https://api.test/api/v1",
    token: "merchant",
    organizationId: "salon-one",
    fetch,
  });
  await client.services.getAll({
    params: { productType: "service", page: 2, limit: 20 },
  });
  await client.resources.setSchedule(
    "staff-one",
    {
      weekly: [{ dayOfWeek: 1, startMinute: 600, endMinute: 1200 }],
      exceptions: [{ date: "2026-12-16", windows: [] }],
    },
    0,
  );
  await client.bookings.action(
    "booking-one",
    "cancel",
    "stable-booking-operation",
  );
  expect(fetch.mock.calls).toHaveLength(3);
  expect(new URL(fetch.mock.calls[0]![0]).searchParams.get("page")).toBe("2");
  expect(JSON.parse(String(fetch.mock.calls[1]![1].body))).toMatchObject({
    action: "set_schedule",
    expectedVersion: 0,
    exceptions: [{ date: "2026-12-16", windows: [] }],
  });
  expect(JSON.parse(String(fetch.mock.calls[2]![1].body))).toEqual({
    action: "cancel",
  });
  expect(
    new Headers(fetch.mock.calls[2]![1].headers).get("idempotency-key"),
  ).toBe("stable-booking-operation");
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer merchant",
    );
    expect(new Headers(init.headers).get("x-organization-id")).toBe(
      "salon-one",
    );
    expect(init.cache).toBe("no-store");
  }
});
it("rejects a missing operation key before sending a booking mutation", () => {
  const fetch = vi.fn();
  const client = createMerchantBookingsClient({
    apiUrl: "https://api.test/api/v1",
    token: "merchant",
    organizationId: "salon-one",
    fetch,
  });
  expect(() => client.bookings.action("one", "cancel", "")).toThrow(
    "idempotency",
  );
  expect(fetch).not.toHaveBeenCalled();
});
