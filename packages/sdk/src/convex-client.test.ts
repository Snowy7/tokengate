import { describe, expect, test } from "bun:test";
import { TokengateConvexClient } from "./convex-client";
import { convexFunctions } from "./index";

describe("TokengateConvexClient", () => {
  test("sends convex query payloads", async () => {
    const calls: RequestInit[] = [];
    const client = new TokengateConvexClient({
      url: "https://example.convex.cloud",
      token: "secret",
      fetcher: async (_input, init) => {
        calls.push(init ?? {});
        return new Response(
          JSON.stringify({
            status: "success",
            value: [{ ok: true }]
          }),
          { status: 200 }
        );
      }
    });

    const result = await client.query(convexFunctions.listWorkspaces, {});

    expect(result).toEqual([{ ok: true }]);
    expect(calls[0]?.method).toBe("POST");
    expect((calls[0]?.headers as Headers).get("authorization")).toBe("Bearer secret");
    expect(String(calls[0]?.body)).toContain(convexFunctions.listWorkspaces);
  });

  test("throws convex errors", async () => {
    const client = new TokengateConvexClient({
      url: "https://example.convex.cloud",
      fetcher: async () =>
        new Response(
          JSON.stringify({
            status: "error",
            errorMessage: "bad request"
          }),
          { status: 200 }
        )
    });

    await expect(client.query(convexFunctions.listWorkspaces, {})).rejects.toThrow("bad request");
  });
});
