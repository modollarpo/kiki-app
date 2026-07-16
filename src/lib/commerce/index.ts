// ============================================================
// KIKI Agent Platform — Commerce Connector Registry
// Central registry of all supported commerce (revenue source)
// platforms. Independent from ad-platform connectors.
// ============================================================

import {
  type CommercePlatformId,
  type ICommerceConnector,
} from "./types";
import { encryptToken, decryptToken } from "./base";
import { WooCommerceConnector } from "./woocommerce";
import { ShopifyConnector } from "./shopify";

const registry: Map<CommercePlatformId, ICommerceConnector> = new Map<
  CommercePlatformId,
  ICommerceConnector
>();
registry.set("woocommerce", new WooCommerceConnector());
registry.set("shopify", new ShopifyConnector());

export function getCommerceConnector(platform: CommercePlatformId): ICommerceConnector {
  const connector = registry.get(platform);
  if (!connector) {
    throw new Error(`Unsupported commerce platform: ${platform}`);
  }
  return connector;
}

export function listCommerceConnectors(): {
  platformId: CommercePlatformId;
  name: string;
  authType: "api_key" | "oauth";
}[] {
  return Array.from(registry.values()).map((c) => ({
    platformId: c.platformId,
    name: c.name,
    authType: c.authType,
  }));
}

export function isCommercePlatformSupported(p: string): p is CommercePlatformId {
  return registry.has(p as CommercePlatformId);
}

export { encryptToken, decryptToken };
export type { CommercePlatformId, ICommerceConnector };
