import { describe, test, expect } from "bun:test";
import { parseValue, validateEnv, maskSensitive, type EnvSchema } from "./schema";

describe("parseValue", () => {
  test("string", () => {
    expect(parseValue("hello", { type: "string" })).toEqual({ value: "hello" });
    expect(parseValue("  spaced  ", { type: "string" })).toEqual({ value: "spaced" });
  });

  test("number", () => {
    expect(parseValue("42", { type: "number" })).toEqual({ value: 42 });
    expect(parseValue("3.14", { type: "number" })).toEqual({ value: 3.14 });
    expect(parseValue("abc", { type: "number" }).error).toBeTruthy();
  });

  test("boolean", () => {
    expect(parseValue("true", { type: "boolean" })).toEqual({ value: true });
    expect(parseValue("1", { type: "boolean" })).toEqual({ value: true });
    expect(parseValue("yes", { type: "boolean" })).toEqual({ value: true });
    expect(parseValue("false", { type: "boolean" })).toEqual({ value: false });
    expect(parseValue("0", { type: "boolean" })).toEqual({ value: false });
    expect(parseValue("no", { type: "boolean" })).toEqual({ value: false });
    expect(parseValue("maybe", { type: "boolean" }).error).toBeTruthy();
  });

  test("string[]", () => {
    expect(parseValue("a,b,c", { type: "string[]" })).toEqual({ value: ["a", "b", "c"] });
    expect(parseValue("a | b | c", { type: "string[]", separator: "|" })).toEqual({ value: ["a", "b", "c"] });
  });

  test("number[]", () => {
    expect(parseValue("1,2,3", { type: "number[]" })).toEqual({ value: [1, 2, 3] });
    expect(parseValue("1,abc,3", { type: "number[]" }).error).toBeTruthy();
  });

  test("url", () => {
    expect(parseValue("https://example.com", { type: "url" })).toEqual({ value: "https://example.com" });
    expect(parseValue("not-a-url", { type: "url" }).error).toBeTruthy();
  });

  test("email", () => {
    expect(parseValue("user@example.com", { type: "email" })).toEqual({ value: "user@example.com" });
    expect(parseValue("invalid", { type: "email" }).error).toBeTruthy();
  });

  test("port", () => {
    expect(parseValue("3000", { type: "port" })).toEqual({ value: 3000 });
    expect(parseValue("0", { type: "port" })).toEqual({ value: 0 });
    expect(parseValue("65535", { type: "port" })).toEqual({ value: 65535 });
    expect(parseValue("70000", { type: "port" }).error).toBeTruthy();
    expect(parseValue("-1", { type: "port" }).error).toBeTruthy();
  });

  test("enum", () => {
    expect(parseValue("info", { type: "enum", values: ["debug", "info", "warn"] })).toEqual({ value: "info" });
    expect(parseValue("bad", { type: "enum", values: ["debug", "info", "warn"] }).error).toBeTruthy();
  });

  test("required missing", () => {
    expect(parseValue(undefined, { type: "string" }).error).toBeTruthy();
    expect(parseValue(undefined, { type: "string", required: false }).error).toBeUndefined();
  });

  test("default", () => {
    expect(parseValue(undefined, { type: "number", default: 42 })).toEqual({ value: 42 });
    expect(parseValue("", { type: "string", default: "fallback" })).toEqual({ value: "fallback" });
  });
});

describe("validateEnv", () => {
  test("validates full schema", () => {
    const schema = {
      DB_URL: { type: "string" as const, required: true },
      PORT: { type: "port" as const, default: 3000 },
      DEBUG: { type: "boolean" as const, default: false },
      LOG_LEVEL: { type: "enum" as const, values: ["debug", "info", "warn", "error"], default: "info" },
    } satisfies EnvSchema;

    const { env, errors } = validateEnv(
      { DB_URL: "postgres://localhost/db", PORT: "8080", LOG_LEVEL: "debug" },
      schema,
    );

    expect(errors).toEqual([]);
    expect(env.DB_URL).toBe("postgres://localhost/db");
    expect(env.PORT).toBe(8080);
    expect(env.DEBUG).toBe(false);
    expect(env.LOG_LEVEL).toBe("debug");
  });

  test("reports errors for invalid values", () => {
    const schema = {
      PORT: { type: "port" as const, required: true },
      URL: { type: "url" as const, required: true },
    } satisfies EnvSchema;

    const { errors } = validateEnv({ PORT: "abc", URL: "not-url" }, schema);
    expect(errors).toHaveLength(2);
    expect(errors[0].key).toBe("PORT");
    expect(errors[1].key).toBe("URL");
  });

  test("reports missing required variables", () => {
    const schema = {
      REQUIRED: { type: "string" as const, required: true },
      OPTIONAL: { type: "string" as const, required: false },
    } satisfies EnvSchema;

    const { errors } = validateEnv({}, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].key).toBe("REQUIRED");
  });

  test("custom validator", () => {
    const schema = {
      PORT: {
        type: "number" as const,
        validate: (v: number) => v >= 1024 || "port must be >= 1024",
      },
    } satisfies EnvSchema;

    const { errors } = validateEnv({ PORT: "80" }, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("port must be >= 1024");
  });
});

describe("maskSensitive", () => {
  test("masks sensitive values", () => {
    const schema = {
      API_KEY: { type: "string" as const, sensitive: true },
      PUBLIC: { type: "string" as const },
    } satisfies EnvSchema;

    const masked = maskSensitive({ API_KEY: "sk-1234567890", PUBLIC: "hello" }, schema);
    expect(masked.API_KEY).toBe("sk***90");
    expect(masked.PUBLIC).toBe("hello");
  });

  test("handles undefined", () => {
    const schema = {
      MISSING: { type: "string" as const, sensitive: true },
    } satisfies EnvSchema;

    const masked = maskSensitive({ MISSING: undefined }, schema);
    expect(masked.MISSING).toBe("<not set>");
  });
});
