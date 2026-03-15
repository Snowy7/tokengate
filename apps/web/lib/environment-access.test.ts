import { describe, expect, it, mock } from "bun:test";
import type { SecretSet, SidebarEnvMeta } from "@tokengate/sdk";
import { pickPreferredSecretSet, resolveEnvironmentSecretSets } from "./environment-access";

function createSecretSet(id: string, filePath: string): SecretSet {
  return {
    id,
    environmentId: "env_123",
    filePath,
    keySalt: "salt_123",
    createdAt: 1,
  };
}

function createMeta(files: Array<{ secretSetId: string; filePath: string | null; latestRevision: number | null }>): SidebarEnvMeta {
  return {
    environment: {
      id: "env_123",
      projectId: "project_123",
      name: "Production",
      slug: "production",
      keySalt: "salt_123",
      createdAt: 1,
    },
    fileCount: files.length,
    files,
    latestRevisionTimestamp: null,
  };
}

describe("resolveEnvironmentSecretSets", () => {
  it("reuses loaded secret sets for the selected environment", async () => {
    const fetchSecretSets = mock(async () => [createSecretSet("ss_fetch", ".env")]);
    const secretSets = [createSecretSet("ss_selected", ".env")];

    const result = await resolveEnvironmentSecretSets({
      environmentId: "env_123",
      selectedEnvironmentId: "env_123",
      selectedSecretSets: secretSets,
      environmentMeta: createMeta([{ secretSetId: "ss_selected", filePath: ".env", latestRevision: 1 }]),
      fetchSecretSets,
    });

    expect(result).toEqual(secretSets);
    expect(fetchSecretSets).not.toHaveBeenCalled();
  });

  it("skips the secret-set query for an empty environment", async () => {
    const fetchSecretSets = mock(async () => [createSecretSet("ss_fetch", ".env")]);

    const result = await resolveEnvironmentSecretSets({
      environmentId: "env_123",
      selectedEnvironmentId: "env_other",
      selectedSecretSets: [],
      environmentMeta: createMeta([]),
      fetchSecretSets,
    });

    expect(result).toEqual([]);
    expect(fetchSecretSets).not.toHaveBeenCalled();
  });

  it("fetches secret sets when the environment is known to have files", async () => {
    const fetched = [createSecretSet("ss_fetch", ".env.local")];
    const fetchSecretSets = mock(async () => fetched);

    const result = await resolveEnvironmentSecretSets({
      environmentId: "env_123",
      selectedEnvironmentId: "env_other",
      selectedSecretSets: [],
      environmentMeta: createMeta([{ secretSetId: "ss_fetch", filePath: ".env.local", latestRevision: 3 }]),
      fetchSecretSets,
    });

    expect(result).toEqual(fetched);
    expect(fetchSecretSets).toHaveBeenCalledTimes(1);
    expect(fetchSecretSets).toHaveBeenCalledWith("env_123");
  });
});

describe("pickPreferredSecretSet", () => {
  it("prefers the matching file path", () => {
    const env = createSecretSet("ss_env", ".env");
    const local = createSecretSet("ss_local", ".env.local");

    expect(pickPreferredSecretSet([env, local], ".env.local")).toEqual(local);
  });

  it("falls back to the first secret set", () => {
    const env = createSecretSet("ss_env", ".env");
    const local = createSecretSet("ss_local", ".env.local");

    expect(pickPreferredSecretSet([env, local], ".env.production")).toEqual(env);
  });
});
