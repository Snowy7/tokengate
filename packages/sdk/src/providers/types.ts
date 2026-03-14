// ---------------------------------------------------------------------------
// Provider Adapter — pluggable interface for external env var services
// ---------------------------------------------------------------------------

export interface EnvVar {
  key: string;
  value: string;
  sensitive?: boolean;
  /** Vercel targets: "production" | "preview" | "development" */
  target?: string[];
}

export interface ProviderConfig {
  /** Decrypted API key or deploy key */
  credential: string;
  /** Convex deployment URL (e.g. https://happy-otter-123.convex.cloud) */
  deploymentUrl?: string;
  /** Vercel project ID or name */
  vercelProjectId?: string;
  /** Vercel target filter */
  target?: string;
}

export interface ProviderAdapter {
  readonly provider: "convex" | "vercel";

  /** Pull all env vars from the provider */
  pull(config: ProviderConfig): Promise<EnvVar[]>;

  /** Push env vars to the provider (upsert semantics) */
  push(config: ProviderConfig, vars: EnvVar[]): Promise<void>;

  /** Test connectivity and credential validity */
  testConnection(config: ProviderConfig): Promise<{ ok: boolean; error?: string }>;
}
