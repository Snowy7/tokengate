import { createEnv } from "@tokengate/env";
import type { EnvSchema } from "@tokengate/env";

const schema = {
  DATABASE_URL: { type: "url" as const, required: true, sensitive: true },
  API_KEY: { type: "string" as const, required: true, sensitive: true },
  PORT: { type: "port" as const, default: 3000 },
  DEBUG: { type: "boolean" as const, default: false },
  APP_NAME: { type: "string" as const, required: true },
  ALLOWED_ORIGINS: { type: "string[]" as const, separator: "," },
  LOG_LEVEL: { type: "enum" as const, values: ["debug", "info", "warn", "error"], default: "info" },
} satisfies EnvSchema;

console.log("=== Cloud Pull Test ===");
console.log("No .env file present — loading from Tokengate cloud\n");
console.log("TOKENGATE_PASSWORD:", process.env.TOKENGATE_PASSWORD ? "set" : "NOT SET");
console.log("");

try {
  const env = await createEnv({
    schema,
    sources: ["cloud", "process"],  // no "file" — force cloud
    onError: "warn",
  });

  console.log("Result:");
  console.log("  DATABASE_URL:", env.DATABASE_URL ? "(loaded, sensitive)" : "MISSING");
  console.log("  API_KEY:", env.API_KEY ? "(loaded, sensitive)" : "MISSING");
  console.log("  PORT:", env.PORT);
  console.log("  DEBUG:", env.DEBUG);
  console.log("  APP_NAME:", env.APP_NAME);
  console.log("  ALLOWED_ORIGINS:", env.ALLOWED_ORIGINS);
  console.log("  LOG_LEVEL:", env.LOG_LEVEL);
  console.log("\nSUCCESS: Values loaded from cloud without .env file!");
} catch (err) {
  console.error("FAILED:", err instanceof Error ? err.message : err);
}
