import { NextRequest, NextResponse } from "next/server";
import { convexFunctions } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      secretSetId?: string;
      targetRevision?: number;
    };

    if (!body.secretSetId || body.targetRevision === undefined) {
      return jsonError(400, "Missing secretSetId or targetRevision");
    }

    const { client } = await getAuthenticatedConvexClient();
    const result = await client.mutation<{ newRevision: number; revisionId: string }>(convexFunctions.restoreRevision, {
      secretSetId: body.secretSetId,
      targetRevision: body.targetRevision
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}
