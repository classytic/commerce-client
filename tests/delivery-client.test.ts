import { afterEach, describe, expect, it, vi } from "vitest";
import { configureAuth, configureClient } from "@classytic/arc-next/client";
import { createStorefrontClient } from "../src/storefront/client.js";
import { createMerchantClient } from "../src/merchant/client.js";
import type { DeliverySettingsUpdate } from "../src/delivery/types.js";

afterEach(() => {
  configureAuth({ getToken: () => null, getOrgId: () => null });
  configureClient({ baseUrl: "", basePath: "/api/v1" });
});
describe("delivery client contracts", () => {
  it("quotes product selections and destination without dashboard credentials", async () => {
    configureAuth({ getToken: () => "private", getOrgId: () => "other" });
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({
        subtotalMinor: 25000,
        deliveryChargeMinor: 6000,
        currency: "BDT",
      }),
    );
    const client = createStorefrontClient({
      apiUrl: "https://api.test/api/v1",
      store: "alpha-store",
      fetch,
    });
    const input = {
      lines: [
        {
          productId: "507f1f77bcf86cd799439011",
          variantSku: "LARGE",
          quantity: 1,
        },
      ],
      areaId: 1,
      country: "BD",
    };
    const quoted = await client.quoteDelivery(input);
    expect(quoted.deliveryChargeMinor).toBe(6000);
    await client.deliveryDistricts();
    await client.deliveryAreas("Dhaka");
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/v1/storefront/alpha-store/orders/quote",
    );
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toEqual(input);
    expect(fetch.mock.calls[2]?.[0]).toContain(
      "/delivery/areas?district=Dhaka",
    );
    for (const [, init] of fetch.mock.calls) {
      expect(new Headers(init.headers).has("authorization")).toBe(false);
      expect(new Headers(init.headers).has("x-organization-id")).toBe(false);
      expect(init.credentials).toBe("omit");
      expect(init.cache).toBe("no-store");
    }
  });
  it("preserves only the supplied code and quote token through checkout retries", async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({
        discountMinor: 100,
        grandTotalMinor: 900,
        currency: "JPY",
        quoteToken: "signed-quote",
      }),
    );
    const client = createStorefrontClient({
      apiUrl: "https://api.test/api/v1",
      store: "alpha-store",
      fetch,
    });
    const lines = [{ productId: "507f1f77bcf86cd799439011", quantity: 1 }];
    const quote = await client.quoteDelivery({
      lines,
      country: "JP",
      promoCode: "SAVE",
    });
    const input = {
      lines,
      promoCode: "SAVE",
      quoteToken: quote.quoteToken,
      customer: { name: "Buyer", phone: "81123456789" },
      shippingAddress: { line1: "Road", city: "Tokyo", country: "JP" },
    };
    await client.checkout(input, { idempotencyKey: "same-checkout-key-001" });
    await client.checkout(input, { idempotencyKey: "same-checkout-key-001" });
    expect(fetch.mock.calls[1]?.[1].body).toBe(fetch.mock.calls[2]?.[1].body);
    expect(
      JSON.parse(String(fetch.mock.calls[1]?.[1].body)),
    ).not.toHaveProperty("grandTotalMinor");
    expect(
      new Headers(fetch.mock.calls[1]?.[1].headers).get("idempotency-key"),
    ).toBe("same-checkout-key-001");
  });
  it("captures merchant scope and sends one versioned delivery update", async () => {
    const districts = [
      {
        id: "dhaka",
        name: "Dhaka",
        divisionId: "dhaka",
        divisionName: "Dhaka",
      },
    ];
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ data: districts }),
    );
    const options = {
      apiUrl: "https://api.test/api/v1",
      token: "seller-token",
      organizationId: "store-a",
      fetch,
    };
    const client = createMerchantClient(options);
    options.token = "another";
    options.organizationId = "store-b";
    expect(await client.delivery.districts()).toEqual(districts);
    const update: DeliverySettingsUpdate = {
      expectedVersion: 2,
      deliveryChargeMinor: 12000,
      deliveryRules: {
        mode: "zones",
        zones: [{ name: "Local", chargeMinor: 6000, districts: ["Dhaka"] }],
        freeOverMinor: 40000,
      },
    };
    await client.delivery.update(update);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      "https://api.test/api/v1/stores/delivery/current",
    );
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1].body))).toEqual(update);
    for (const [, init] of fetch.mock.calls) {
      expect(new Headers(init.headers).get("authorization")).toBe(
        "Bearer seller-token",
      );
      expect(new Headers(init.headers).get("x-organization-id")).toBe(
        "store-a",
      );
      expect(init.credentials).toBe("omit");
    }
  });
});

it("preserves each custom sizing request through quotes and idempotent guest checkout", async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({ orderNumber: "CUSTOM-1", currency: "BDT" }),
  );
  const client = createStorefrontClient({
    apiUrl: "https://api.test/api/v1",
    store: "custom-store",
    fetch,
  });
  const lines = [12, 13].map((chest) => ({
    productId: "507f1f77bcf86cd799439011",
    variantSku: "CUSTOM",
    quantity: 1,
    customSizing: { measurements: { chest }, note: "Loose fit" },
  }));
  await client.quoteDelivery({ lines, country: "BD" });
  const input = {
    lines,
    customer: { name: "Buyer", phone: "01712345678" },
    shippingAddress: { line1: "Road", city: "Dhaka", country: "BD" },
  };
  await client.checkout(input, { idempotencyKey: "custom-size-checkout-001" });
  await client.checkout(input, { idempotencyKey: "custom-size-checkout-001" });
  for (const [, init] of fetch.mock.calls)
    expect(JSON.parse(String(init.body)).lines).toEqual(lines);
  expect(fetch.mock.calls[1]?.[1].body).toBe(fetch.mock.calls[2]?.[1].body);
});
