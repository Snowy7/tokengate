import type { ProviderAdapter, ProviderConfig, EnvVar } from "./types";

interface VercelEnvVar {
  id: string;
  key: string;
  value: string;
  type: string;
  target: string[];
}

export class VercelAdapter implements ProviderAdapter {
  readonly provider = "vercel" as const;

  async pull(config: ProviderConfig): Promise<EnvVar[]> {
    const projectId = this.projectId(config);
    const targetParam = config.target ? `&target=${config.target}` : "";

    const response = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env?decrypt=true${targetParam}`,
      { headers: this.headers(config) },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Vercel API error (${response.status}): ${text}`);
    }

    const data = await response.json() as { envs: VercelEnvVar[] };
    const envs = data.envs ?? [];

    return envs.map((v) => ({
      key: v.key,
      value: v.value ?? "",
      sensitive: v.type === "secret" || v.type === "sensitive",
      target: v.target,
    }));
  }

  async push(config: ProviderConfig, vars: EnvVar[]): Promise<void> {
    const projectId = this.projectId(config);
    const target = config.target ? [config.target] : ["production", "preview", "development"];

    // Upsert all vars
    const body = vars.map((v) => ({
      key: v.key,
      value: v.value,
      type: v.sensitive ? "sensitive" : "plain",
      target,
    }));

    const response = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env?upsert=true`,
      {
        method: "POST",
        headers: {
          ...this.headers(config),
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Vercel API error (${response.status}): ${text}`);
    }

    // Delete vars that exist remotely but not locally
    const remote = await this.pull(config);
    const localKeys = new Set(vars.map((v) => v.key));
    const toDelete = remote.filter((r) => !localKeys.has(r.key));

    for (const v of toDelete) {
      // Need to get the var ID — pull again with full data
      const listRes = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/env`,
        { headers: this.headers(config) },
      );
      if (!listRes.ok) break;
      const listData = await listRes.json() as { envs: VercelEnvVar[] };
      const remoteVar = listData.envs?.find((e) => e.key === v.key);
      if (remoteVar) {
        await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env/${remoteVar.id}`,
          { method: "DELETE", headers: this.headers(config) },
        );
      }
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

  private projectId(config: ProviderConfig): string {
    if (!config.vercelProjectId) {
      throw new Error("Vercel project ID is required");
    }
    return config.vercelProjectId;
  }

  private headers(config: ProviderConfig): Record<string, string> {
    return {
      authorization: `Bearer ${config.credential}`,
    };
  }
}
