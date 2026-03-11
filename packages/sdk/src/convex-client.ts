import type { ConvexFunctionName } from "./index";

export interface ConvexTransportOptions {
  url: string;
  token?: string;
  fetcher?: typeof fetch;
}

interface ConvexSuccess<T> {
  status: "success";
  value: T;
}

interface ConvexFailure {
  status: "error";
  errorMessage: string;
}

type ConvexResponse<T> = ConvexSuccess<T> | ConvexFailure;

export class TokengateConvexClient {
  private readonly url: string;
  private readonly token?: string;
  private readonly fetcher: typeof fetch;

  constructor(options: ConvexTransportOptions) {
    this.url = options.url.replace(/\/$/, "");
    this.token = options.token;
    this.fetcher = options.fetcher ?? fetch;
  }

  query<T>(path: ConvexFunctionName, args: Record<string, unknown> = {}) {
    return this.call<T>("query", path, args);
  }

  mutation<T>(path: ConvexFunctionName, args: Record<string, unknown> = {}) {
    return this.call<T>("mutation", path, args);
  }

  private async call<T>(
    kind: "query" | "mutation",
    path: ConvexFunctionName,
    args: Record<string, unknown>
  ): Promise<T> {
    const response = await this.fetcher(`${this.url}/api/${kind}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        path,
        format: "convex_encoded_json",
        args: [args]
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401 || isAuthError(text)) {
        throw new AuthError(text);
      }
      throw new Error(text);
    }

    const payload = (await response.json()) as ConvexResponse<T>;
    if (payload.status === "error") {
      if (isAuthError(payload.errorMessage)) {
        throw new AuthError(payload.errorMessage);
      }
      throw new Error(payload.errorMessage);
    }

    return normalizeConvexValue(payload.value) as T;
  }

  private headers() {
    const headers = new Headers({
      "content-type": "application/json"
    });

    if (this.token) {
      headers.set("authorization", `Bearer ${this.token}`);
    }

    return headers;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function isAuthError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("unauthenticated") ||
    lower.includes("oidc token") ||
    lower.includes("token") && lower.includes("expired") ||
    lower.includes("could not verify")
  );
}

function normalizeConvexValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeConvexValue(item)) as T;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const normalized = Object.fromEntries(
      Object.entries(record).map(([key, entryValue]) => [key, normalizeConvexValue(entryValue)])
    );

    if ("_id" in record && !("id" in record)) {
      normalized.id = record._id;
    }

    return normalized as T;
  }

  return value;
}
