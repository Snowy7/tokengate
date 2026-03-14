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

    const data = await response.json() as Record<string, string>;

    // Convex returns { NAME: "value", ... }
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
}
