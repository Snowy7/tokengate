import type { ProviderAdapter, ProviderConfig, EnvVar } from "./types";

export class ConvexAdapter implements ProviderAdapter {
  readonly provider = "convex" as const;

  async pull(config: ProviderConfig): Promise<EnvVar[]> {
    const url = this.baseUrl(config);
    const response = await fetch(`${url}/api/v1/list_environment_variables`, {
      method: "GET",
      headers: this.headers(config),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Convex API error (${response.status}): ${text}`);
    }

    const raw = await response.json() as unknown;
    const data = this.unwrapEnvironmentVariables(raw);

    return Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  }

  async push(config: ProviderConfig, vars: EnvVar[]): Promise<void> {
    const url = this.baseUrl(config);

    // Convex expects { environment_variables: { NAME: "value", ... } }
    const envVars: Record<string, string> = {};
    for (const v of vars) {
      envVars[v.key] = v.value;
    }

    const response = await fetch(`${url}/api/v1/update_environment_variables`, {
      method: "POST",
      headers: {
        ...this.headers(config),
        "content-type": "application/json",
      },
      body: JSON.stringify({ environment_variables: envVars }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Convex API error (${response.status}): ${text}`);
    }
  }

  async testConnection(config: ProviderConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.pull(config);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  private baseUrl(config: ProviderConfig): string {
    if (!config.deploymentUrl) {
      throw new Error("Convex deployment URL is required");
    }
    return config.deploymentUrl.replace(/\/$/, "");
  }

  private headers(config: ProviderConfig): Record<string, string> {
    return {
      authorization: `Convex ${config.credential}`,
    };
  }

  private unwrapEnvironmentVariables(payload: unknown): Record<string, string> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    const record = payload as Record<string, unknown>;
    const candidate =
      this.asStringRecord(record.environment_variables) ??
      this.asStringRecord(record.environmentVariables) ??
      this.asStringRecord(record);

    return candidate ?? {};
  }

  private asStringRecord(value: unknown): Record<string, string> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry ?? "")])
    );
  }
}
