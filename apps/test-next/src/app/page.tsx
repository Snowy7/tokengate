import { getEnv } from "@tokengate/env-next";
import { maskSensitive } from "@tokengate/env";
import type { EnvSchema } from "@tokengate/env";

const schema = {
  DATABASE_URL: { type: "url" as const, required: true, sensitive: true },
  API_KEY: { type: "string" as const, required: true, sensitive: true },
  PORT: { type: "port" as const, default: 3000 },
  DEBUG: { type: "boolean" as const, default: false },
  APP_NAME: { type: "string" as const, default: "TestNext" },
  LOG_LEVEL: { type: "enum" as const, values: ["debug", "info", "warn", "error"] as string[], default: "info" },
} satisfies EnvSchema;

export const dynamic = "force-dynamic";

export default async function Home() {
  let env: Record<string, unknown> = {};
  let error: string | null = null;
  let masked: Record<string, string> = {};

  try {
    env = await getEnv({ schema, sources: ["cloud", "process"], onError: "warn" }) as Record<string, unknown>;
    masked = maskSensitive(env, schema);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, marginBottom: 8 }}>
        Tokengate + Next.js
      </h1>
      <p style={{ color: "#999", marginBottom: 32 }}>
        No <code style={{ background: "#1a2a1f", padding: "2px 6px", color: "#00d68f" }}>.env</code> file — all values loaded from Tokengate cloud, decrypted server-side.
      </p>

      {error && (
        <div style={{ background: "#2e0d0d", border: "3px solid #dc2626", padding: 16, marginBottom: 24 }}>
          <strong style={{ color: "#dc2626" }}>Error:</strong> {error}
        </div>
      )}

      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 700, fontFamily: "'Space Mono', monospace", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "3px solid #00d68f" }}>
            <th style={{ textAlign: "left", padding: "8px 16px", color: "#00d68f", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Variable</th>
            <th style={{ textAlign: "left", padding: "8px 16px", color: "#00d68f", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Value</th>
            <th style={{ textAlign: "left", padding: "8px 16px", color: "#00d68f", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(masked).map(([key, val]) => (
            <tr key={key} style={{ borderBottom: "1px solid #1e2a24" }}>
              <td style={{ padding: "8px 16px", fontWeight: 700, color: "#00d68f" }}>{key}</td>
              <td style={{ padding: "8px 16px", color: "#ccc" }}>{val}</td>
              <td style={{ padding: "8px 16px", color: "#666" }}>{typeof env[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 32, padding: 16, background: "#0d2e1f", border: "3px solid #00d68f", fontSize: 12 }}>
        <strong style={{ color: "#00d68f" }}>How this works:</strong>
        <ol style={{ color: "#999", lineHeight: 1.8, marginTop: 8 }}>
          <li><code>getEnv()</code> from <code>@tokengate/env-next</code> runs server-side</li>
          <li>Reads <code>.tokengate.json</code> for project/environment IDs</li>
          <li>Fetches encrypted blob from Convex via <code>TOKENGATE_PASSWORD</code></li>
          <li>Decrypts with AES-256-GCM locally — server never sees plaintext</li>
          <li>Validates against schema, returns typed values</li>
        </ol>
      </div>
    </div>
  );
}
