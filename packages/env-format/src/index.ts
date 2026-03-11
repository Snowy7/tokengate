export interface EnvEntry {
  key: string;
  value: string;
}

const COMMENT_PREFIXES = ["#", ";"];

export function parseEnvDocument(source: string): EnvEntry[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const entries = new Map<string, string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries.set(key, value);
  }

  return [...entries.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, value }));
}

export function normalizeEnvDocument(source: string): string {
  return stringifyEnvEntries(parseEnvDocument(source));
}

export function stringifyEnvEntries(entries: EnvEntry[]): string {
  return entries
    .slice()
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(({ key, value }) => `${key}=${quoteIfNeeded(value)}`)
    .join("\n")
    .concat(entries.length > 0 ? "\n" : "");
}

export function envEntriesToObject(entries: EnvEntry[]): Record<string, string> {
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.value]));
}

export function envObjectToEntries(values: Record<string, string>): EnvEntry[] {
  return Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, value }));
}

function quoteIfNeeded(value: string): string {
  return /[\s#;]/.test(value) ? JSON.stringify(value) : value;
}

