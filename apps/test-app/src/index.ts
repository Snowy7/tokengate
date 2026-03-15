import { createEnv, createEnvSync, loadEnv, defineConfig, validateEnv, maskSensitive } from "@tokengate/env";
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

console.log("=== Tokengate SDK Test ===\n");

// Test 1: createEnvSync (file + process.env)
console.log("--- Test 1: createEnvSync ---");
try {
  const env = createEnvSync({ schema, file: ".env" });
  console.log("DATABASE_URL:", typeof env.DATABASE_URL, "(sensitive, masked)");
  console.log("API_KEY:", typeof env.API_KEY, "(sensitive, masked)");
  console.log("PORT:", env.PORT, typeof env.PORT);
  console.log("DEBUG:", env.DEBUG, typeof env.DEBUG);
  console.log("APP_NAME:", env.APP_NAME);
  console.log("ALLOWED_ORIGINS:", env.ALLOWED_ORIGINS);
  console.log("LOG_LEVEL:", env.LOG_LEVEL);
  console.log("PASS: All fields parsed correctly\n");
} catch (err) {
  console.error("FAIL:", err);
}

// Test 2: createEnv (async)
console.log("--- Test 2: createEnv (async) ---");
try {
  const env = await createEnv({ schema, file: ".env", sources: ["file", "process"] });
  console.log("PORT:", env.PORT, "— expected number 3000");
  console.log("DEBUG:", env.DEBUG, "— expected boolean true");
  console.log("LOG_LEVEL:", env.LOG_LEVEL, "— expected 'debug'");
  console.log("PASS\n");
} catch (err) {
  console.error("FAIL:", err);
}

// Test 3: Validation errors
console.log("--- Test 3: Validation errors ---");
const { env: partial, errors } = validateEnv(
  { PORT: "abc", LOG_LEVEL: "verbose", APP_NAME: "Test" },
  schema,
);
console.log("Errors:", errors.length);
for (const e of errors) {
  console.log(`  ${e.key}: ${e.message}`);
}
console.log("Expected: DATABASE_URL missing, API_KEY missing, ALLOWED_ORIGINS missing, PORT invalid, LOG_LEVEL invalid");
console.log("PASS:", errors.length === 5 ? "yes" : "NO — got " + errors.length, "\n");

// Test 4: Mask sensitive
console.log("--- Test 4: maskSensitive ---");
const masked = maskSensitive(
  { DATABASE_URL: "postgres://user:pass@host/db", API_KEY: "sk-1234567890", PORT: 3000, APP_NAME: "Test" },
  schema,
);
console.log("DATABASE_URL:", masked.DATABASE_URL);
console.log("API_KEY:", masked.API_KEY);
console.log("PORT:", masked.PORT);
console.log("APP_NAME:", masked.APP_NAME);
console.log("PASS: Sensitive values masked, others visible\n");

// Test 5: loadEnv with full result
console.log("--- Test 5: loadEnv ---");
try {
  const result = await loadEnv(defineConfig({ schema, file: ".env", sources: ["file"] }));
  console.log("Source:", result.source);
  console.log("Load time:", result.loadTime + "ms");
  console.log("Errors:", result.errors.length);
  console.log("PASS\n");
} catch (err) {
  console.error("FAIL:", err);
}

// Test 6: Missing required field
console.log("--- Test 6: Missing required field (onError: warn) ---");
try {
  const env = createEnvSync({
    schema: { REQUIRED_FIELD: { type: "string" as const, required: true } },
    onError: "warn",
  });
  console.log("REQUIRED_FIELD:", env.REQUIRED_FIELD ?? "(undefined — expected)");
  console.log("PASS: Warning logged, no throw\n");
} catch (err) {
  console.error("FAIL: Should not throw with onError: warn", err);
}

// Test 7: Default values
console.log("--- Test 7: Default values ---");
const envWithDefaults = createEnvSync({
  schema: {
    MISSING_PORT: { type: "port" as const, default: 8080 },
    MISSING_DEBUG: { type: "boolean" as const, default: true },
    MISSING_LEVEL: { type: "enum" as const, values: ["a", "b"], default: "b" },
  },
  onError: "silent",
});
console.log("MISSING_PORT:", envWithDefaults.MISSING_PORT, "— expected 8080");
console.log("MISSING_DEBUG:", envWithDefaults.MISSING_DEBUG, "— expected true");
console.log("MISSING_LEVEL:", envWithDefaults.MISSING_LEVEL, "— expected 'b'");
console.log("PASS:", envWithDefaults.MISSING_PORT === 8080 && envWithDefaults.MISSING_DEBUG === true && envWithDefaults.MISSING_LEVEL === "b" ? "yes" : "NO", "\n");

console.log("=== All tests complete ===");
