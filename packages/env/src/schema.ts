// ---------------------------------------------------------------------------
// Schema definition — TypeScript-native env variable schemas
// ---------------------------------------------------------------------------

/** Supported scalar types for env variables */
export type EnvType = "string" | "number" | "boolean" | "string[]" | "number[]" | "url" | "email" | "port" | "enum";

/** Schema definition for a single env variable */
export interface EnvVarSchema<T extends EnvType = EnvType> {
  /** The type to parse/validate the value as */
  type: T;
  /** If true, the variable MUST be present (default: true unless `default` is set) */
  required?: boolean;
  /** Default value if not present */
  default?: InferScalar<T>;
  /** Mark as sensitive — masked in logs/debug output */
  sensitive?: boolean;
  /** Description shown in generated docs/types */
  description?: string;
  /** For type "enum" — allowed values */
  values?: string[];
  /** For array types — separator character (default: ",") */
  separator?: string;
  /** Custom validation function */
  validate?: (value: InferScalar<T>) => boolean | string;
}

/** Map of variable name → schema */
export type EnvSchema = Record<string, EnvVarSchema>;

/** Infer the TypeScript type from an EnvType string */
export type InferScalar<T extends EnvType> =
  T extends "string" ? string :
  T extends "number" ? number :
  T extends "boolean" ? boolean :
  T extends "string[]" ? string[] :
  T extends "number[]" ? number[] :
  T extends "url" ? string :
  T extends "email" ? string :
  T extends "port" ? number :
  T extends "enum" ? string :
  never;

/** Infer the full typed env object from a schema definition */
export type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: S[K] extends { default: infer D }
    ? D extends undefined ? InferScalar<S[K]["type"]> | undefined : InferScalar<S[K]["type"]>
    : S[K] extends { required: false }
    ? InferScalar<S[K]["type"]> | undefined
    : InferScalar<S[K]["type"]>;
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export interface ParseResult {
  value: unknown;
  error?: string;
}

export function parseValue(raw: string | undefined, schema: EnvVarSchema): ParseResult {
  // Handle missing values
  if (raw === undefined || raw === "") {
    if (schema.default !== undefined) {
      return { value: schema.default };
    }
    const isRequired = schema.required !== false;
    if (isRequired) {
      return { value: undefined, error: "required but not set" };
    }
    return { value: undefined };
  }

  const trimmed = raw.trim();

  switch (schema.type) {
    case "string":
      return { value: trimmed };

    case "number": {
      const n = Number(trimmed);
      if (isNaN(n)) return { value: undefined, error: `"${trimmed}" is not a valid number` };
      return { value: n };
    }

    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (["true", "1", "yes", "on"].includes(lower)) return { value: true };
      if (["false", "0", "no", "off", ""].includes(lower)) return { value: false };
      return { value: undefined, error: `"${trimmed}" is not a valid boolean` };
    }

    case "string[]": {
      const sep = schema.separator ?? ",";
      return { value: trimmed.split(sep).map((s) => s.trim()).filter(Boolean) };
    }

    case "number[]": {
      const sep = schema.separator ?? ",";
      const parts = trimmed.split(sep).map((s) => s.trim()).filter(Boolean);
      const nums = parts.map(Number);
      const bad = nums.findIndex(isNaN);
      if (bad !== -1) return { value: undefined, error: `"${parts[bad]}" is not a valid number in array` };
      return { value: nums };
    }

    case "url": {
      try {
        new URL(trimmed);
        return { value: trimmed };
      } catch {
        return { value: undefined, error: `"${trimmed}" is not a valid URL` };
      }
    }

    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return { value: undefined, error: `"${trimmed}" is not a valid email` };
      }
      return { value: trimmed };
    }

    case "port": {
      const n = Number(trimmed);
      if (isNaN(n) || !Number.isInteger(n) || n < 0 || n > 65535) {
        return { value: undefined, error: `"${trimmed}" is not a valid port (0-65535)` };
      }
      return { value: n };
    }

    case "enum": {
      if (schema.values && !schema.values.includes(trimmed)) {
        return { value: undefined, error: `"${trimmed}" is not one of: ${schema.values.join(", ")}` };
      }
      return { value: trimmed };
    }

    default:
      return { value: trimmed };
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationError {
  key: string;
  message: string;
}

/**
 * Validate a flat key-value record against a schema.
 * Returns { env, errors } — env contains parsed values, errors lists problems.
 */
export function validateEnv<S extends EnvSchema>(
  raw: Record<string, string | undefined>,
  schema: S,
): { env: InferEnv<S>; errors: ValidationError[] } {
  const env: Record<string, unknown> = {};
  const errors: ValidationError[] = [];

  for (const [key, varSchema] of Object.entries(schema)) {
    const result = parseValue(raw[key], varSchema);

    if (result.error) {
      errors.push({ key, message: result.error });
      env[key] = result.value;
      continue;
    }

    // Run custom validator if present
    if (result.value !== undefined && varSchema.validate) {
      const valid = varSchema.validate(result.value as never);
      if (valid !== true) {
        const msg = typeof valid === "string" ? valid : "failed custom validation";
        errors.push({ key, message: msg });
      }
    }

    env[key] = result.value;
  }

  return { env: env as InferEnv<S>, errors };
}

/**
 * Mask sensitive values for logging/debugging.
 */
export function maskSensitive<S extends EnvSchema>(
  env: Record<string, unknown>,
  schema: S,
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, varSchema] of Object.entries(schema)) {
    const val = env[key];
    if (val === undefined) {
      masked[key] = "<not set>";
    } else if (varSchema.sensitive) {
      const str = String(val);
      masked[key] = str.length <= 4 ? "****" : str.slice(0, 2) + "***" + str.slice(-2);
    } else {
      masked[key] = String(val);
    }
  }
  return masked;
}
