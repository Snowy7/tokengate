import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Integration } from "@tokengate/sdk";
import { createAdapter } from "@tokengate/sdk/providers";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

/**
 * Infer a schema field type from a raw string value.
 */
function inferType(key: string, value: string): { type: string; sensitive: boolean } {
  const sensitive = /secret|key|token|password|private|credential|auth/i.test(key);
  const trimmed = value.trim().replace(/^["']|["']$/g, "");

  if (/^(true|false|yes|no|on|off|0|1)$/i.test(trimmed)) return { type: "boolean", sensitive };
  if (/^\d+$/.test(trimmed) && Number(trimmed) >= 0 && Number(trimmed) <= 65535) return { type: "number", sensitive };
  if (/^https?:\/\//.test(trimmed)) return { type: "url", sensitive };

  return { type: "string", sensitive };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { direction?: "pull" | "push"; mappingIndex?: number };
    const direction = body.direction ?? "pull";

    const { client } = await getAuthenticatedConvexClient();
    const integration = await client.query<Integration>(convexFunctions.getIntegration, { integrationId: id });
    if (!integration) {
      return jsonError(404, "Integration not found");
    }

    const credential = integration.config.wrappedCredential;
    const adapter = createAdapter(integration.provider);
    const providerConfig = {
      credential,
      deploymentUrl: integration.config.deploymentUrl,
      vercelProjectId: integration.config.vercelProjectId,
    };

    const mapping = integration.environmentMappings[body.mappingIndex ?? 0];

    if (direction === "pull") {
      // 1. Pull raw vars from provider
      const vars = await adapter.pull({
        ...providerConfig,
        target: mapping?.providerTarget,
      });

      if (vars.length === 0) {
        await client.mutation(convexFunctions.updateIntegrationSyncStatus, {
          integrationId: id, status: "success",
        });
        return NextResponse.json({ success: true, direction: "pull", count: 0, schemaCreated: false });
      }

      // 2. Auto-generate schema from pulled vars
      const filePath = mapping?.filePath ?? ".env";
      const projectId = integration.projectId;

      const schemaFields = vars.map((v) => {
        const { type, sensitive } = inferType(v.key, v.value);
        return {
          name: v.key,
          type,
          required: true,
          sensitive: v.sensitive ?? sensitive,
        };
      });

      // Upsert the schema — merges with existing fields if schema already exists
      interface SchemaRow { fields: Array<{ name: string; type: string; required: boolean; sensitive: boolean }> }
      let existingSchema: SchemaRow | null = null;
      try {
        existingSchema = await client.query<SchemaRow | null>(
          convexFunctions.getFileSchema,
          { projectId, filePath }
        );
      } catch { /* no existing schema */ }

      // Merge: keep existing fields, add new ones from provider
      const existingNames = new Set(existingSchema?.fields.map((f: { name: string }) => f.name) ?? []);
      const mergedFields = [
        ...(existingSchema?.fields ?? []),
        ...schemaFields.filter((f) => !existingNames.has(f.name)),
      ];

      await client.mutation(convexFunctions.upsertFileSchema, {
        projectId,
        filePath,
        fields: mergedFields,
      });

      // 3. Update sync status
      await client.mutation(convexFunctions.updateIntegrationSyncStatus, {
        integrationId: id, status: "success",
      });

      return NextResponse.json({
        success: true,
        direction: "pull",
        count: vars.length,
        schemaCreated: true,
        schemaFields: mergedFields.length,
        newFields: schemaFields.filter((f) => !existingNames.has(f.name)).length,
        vars: vars.map((v) => ({ key: v.key, sensitive: v.sensitive ?? inferType(v.key, v.value).sensitive })),
      });
    }

    if (direction === "push") {
      const pushBody = body as { direction: "push"; vars?: Array<{ key: string; value: string; sensitive?: boolean }> };
      if (!pushBody.vars) {
        return jsonError(400, "Missing vars for push");
      }

      await adapter.push(
        { ...providerConfig, target: mapping?.providerTarget },
        pushBody.vars,
      );

      await client.mutation(convexFunctions.updateIntegrationSyncStatus, {
        integrationId: id, status: "success",
      });

      return NextResponse.json({ success: true, direction: "push", count: pushBody.vars.length });
    }

    return jsonError(400, "Invalid direction");
  } catch (error) {
    try {
      const { id } = await params;
      const { client } = await getAuthenticatedConvexClient();
      await client.mutation(convexFunctions.updateIntegrationSyncStatus, {
        integrationId: id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch { /* ignore */ }
    return handleApiError(error);
  }
}
