import { describe, expect, it } from "bun:test";
import { TokengateConvexClient } from "./convex-client";
import { convexFunctions } from "./index";

describe("TokengateConvexClient", () => {
  it("normalizes convex document ids to id", async () => {
    const client = new TokengateConvexClient({
      url: "https://example.convex.cloud",
      token: "token",
      fetcher: async () =>
        new Response(
          JSON.stringify({
            status: "success",
            value: {
              _id: "workspace_123",
              name: "Acme",
              nested: [{ _id: "project_123", name: "web" }]
            }
          })
        )
    });

    const result = await client.query<{ id: string; nested: Array<{ id: string }> }>(convexFunctions.listWorkspaces, {});
    expect(result.id).toBe("workspace_123");
    expect(result.nested[0]?.id).toBe("project_123");
  });
});
