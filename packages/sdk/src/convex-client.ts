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
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as ConvexResponse<T>;
    if (payload.status === "error") {
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
