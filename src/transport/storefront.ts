import { createClient, type ArcClientConfig } from "@classytic/arc-next/client";

export interface StorefrontClientOptions {
  /** Full API mount, for example https://api.example.com/api/v1. */
  apiUrl: string;
  store: string;
  timeoutMs?: number;
  fetch?: ArcClientConfig["fetch"];
}

export function createStorefrontTransport(options: StorefrontClientOptions) {
  const store = options.store;
  const url = new URL(options.apiUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "apiUrl must be an HTTP(S) API mount without credentials, query or fragment.",
    );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store))
    throw new Error("A valid store slug is required.");
  return createClient({
    baseUrl: url.href.replace(/\/+$/, ""),
    getToken: () => null,
    getOrgId: () => null,
    authMode: "bearer",
    credentials: "omit",
    autoIdempotency: false,
    timeoutMs: options.timeoutMs ?? 15000,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
}
