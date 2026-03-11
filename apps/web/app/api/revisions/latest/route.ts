import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type SecretRevision } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const secretSetId = request.nextUrl.searchParams.get("secretSetId");
    if (!secretSetId) {
      return jsonError(400, "Missing secretSetId");
    }

    const { client } = await getAuthenticatedConvexClient();
    const revision = await client.query<SecretRevision | null>(convexFunctions.getLatestRevision, {
      secretSetId
    });

    return NextResponse.json({ revision });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}

