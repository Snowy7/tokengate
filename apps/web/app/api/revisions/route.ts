import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type CreateRevisionResult } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      secretSetId?: string;
      baseRevision?: number;
      ciphertext?: string;
      wrappedDataKey?: string;
      contentHash?: string;
    };

    if (!body.secretSetId || !body.ciphertext || !body.wrappedDataKey || !body.contentHash) {
      return jsonError(400, "Missing revision fields");
    }

    const { client } = await getAuthenticatedConvexClient();
    const result = await client.mutation<CreateRevisionResult>(convexFunctions.createRevision, {
      secretSetId: body.secretSetId,
      baseRevision: body.baseRevision,
      ciphertext: body.ciphertext,
      wrappedDataKey: body.wrappedDataKey,
      contentHash: body.contentHash
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}

