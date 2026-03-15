import type { SecretSet, SidebarEnvMeta } from "@tokengate/sdk";

interface ResolveEnvironmentSecretSetsOptions {
  environmentId: string;
  selectedEnvironmentId: string;
  selectedSecretSets: SecretSet[];
  environmentMeta?: SidebarEnvMeta | null;
  fetchSecretSets: (environmentId: string) => Promise<SecretSet[]>;
}

export async function resolveEnvironmentSecretSets({
  environmentId,
  selectedEnvironmentId,
  selectedSecretSets,
  environmentMeta,
  fetchSecretSets,
}: ResolveEnvironmentSecretSetsOptions): Promise<SecretSet[]> {
  if (environmentId === selectedEnvironmentId && selectedSecretSets.length > 0) {
    return selectedSecretSets;
  }

  if (environmentMeta && environmentMeta.files.length === 0) {
    return [];
  }

  return fetchSecretSets(environmentId);
}

export function pickPreferredSecretSet(secretSets: SecretSet[], filePath?: string): SecretSet | null {
  return secretSets.find((secretSet) => (secretSet.filePath || ".env") === (filePath || ".env"))
    ?? secretSets[0]
    ?? null;
}
