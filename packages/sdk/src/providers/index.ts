export type { ProviderAdapter, ProviderConfig, EnvVar } from "./types";
export { ConvexAdapter } from "./convex-adapter";
export { VercelAdapter } from "./vercel-adapter";

import type { ProviderAdapter } from "./types";
import { ConvexAdapter } from "./convex-adapter";
import { VercelAdapter } from "./vercel-adapter";

export function createAdapter(provider: string): ProviderAdapter {
  switch (provider) {
    case "convex":
      return new ConvexAdapter();
    case "vercel":
      return new VercelAdapter();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
