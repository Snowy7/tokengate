import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const env = await getEnv({ schema, sources: ["cloud", "process"], onError: "warn" });
    const masked = maskSensitive(env as Record<string, unknown>, schema);

    return NextResponse.json({
      source: "tokengate-cloud",
      variables: masked,
      types: Object.fromEntries(
        Object.entries(env as Record<string, unknown>).map(([k, v]) => [k, typeof v])
      ),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
