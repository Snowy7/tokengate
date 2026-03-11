import { auth } from "@clerk/nextjs/server";
import { TokengateConvexClient } from "@tokengate/sdk/convex-client";

function getConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return url;
}

export async function getAuthenticatedConvexClient() {
  const authObject = await auth();
  if (!authObject.userId) {
    throw new Error("Unauthorized");
  }

  const token = await authObject.getToken({ template: "convex" });
  if (!token) {
    throw new Error("Unable to mint Convex token from Clerk");
  }

  return {
    userId: authObject.userId,
    token,
    client: new TokengateConvexClient({
      url: getConvexUrl(),
      token
    })
  };
}

export function createConvexClientForToken(token: string) {
  return new TokengateConvexClient({
    url: getConvexUrl(),
    token
  });
}

