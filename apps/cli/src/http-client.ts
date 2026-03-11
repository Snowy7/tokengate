import type { CliConfig } from "@tokengate/sdk";

export class TokengateHttpClient {
  constructor(private readonly config: CliConfig) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(new URL(path, this.config.apiUrl), {
      headers: this.headers()
    });
    return this.handle<T>(response);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(new URL(path, this.config.apiUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.headers()
      },
      body: JSON.stringify(body)
    });
    return this.handle<T>(response);
  }

  private headers() {
    const headers = new Headers();
    if (this.config.accessToken) {
      headers.set("authorization", `Bearer ${this.config.accessToken}`);
    }
    return headers;
  }

  private async handle<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Request failed: ${response.status} ${message}`);
    }
    return (await response.json()) as T;
  }
}
