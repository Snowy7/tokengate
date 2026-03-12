import { NextRequest, NextResponse } from "next/server";
import { convexFunctions } from "@tokengate/sdk";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };

    if (!body.token) {
      return jsonError(400, "Missing token");
    }

    const { client } = await getAuthenticatedConvexClient();
    const result = await client.mutation<{ workspaceId: string }>(
      convexFunctions.acceptInvite,
      { token: body.token }
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
