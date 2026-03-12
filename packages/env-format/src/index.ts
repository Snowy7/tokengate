export interface EnvEntry {
  key: string;
  value: string;
}

export function parseEnvDocument(source: string): EnvEntry[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const entries = new Map<string, string>();

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    i++;

    // Skip empty lines and full-line comments
    if (!line || line.startsWith("#") || line.startsWith(";")) {
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    const rawValue = line.slice(equalIndex + 1);
    const trimmed = rawValue.trimStart();

    let value: string;

    if (trimmed.startsWith('"')) {
      // Double-quoted value — may span multiple lines, supports escapes
      const { parsed, linesConsumed } = parseDoubleQuoted(trimmed, lines, i);
      value = parsed;
      i += linesConsumed;
    } else if (trimmed.startsWith("'")) {
      // Single-quoted value — may span multiple lines, literal (no escapes)
      const { parsed, linesConsumed } = parseSingleQuoted(trimmed, lines, i);
      value = parsed;
      i += linesConsumed;
    } else if (trimmed.startsWith("`")) {
      // Backtick-quoted value — may span multiple lines, literal
      const { parsed, linesConsumed } = parseBacktickQuoted(trimmed, lines, i);
      value = parsed;
      i += linesConsumed;
    } else {
      // Unquoted value — strip inline comments
      value = stripInlineComment(trimmed);
    }

    entries.set(key, value);
  }

  return [...entries.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, value }));
}

/** Parse a double-quoted value, handling escapes and multiline. */
function parseDoubleQuoted(
  firstLine: string,
  allLines: string[],
  nextLineIndex: number
): { parsed: string; linesConsumed: number } {
  // Start after the opening quote
  let buf = firstLine.slice(1);
  let linesConsumed = 0;

  // Look for unescaped closing double quote
  const closeIdx = findUnescapedQuote(buf, '"');
  if (closeIdx !== -1) {
    return { parsed: unescapeDoubleQuoted(buf.slice(0, closeIdx)), linesConsumed: 0 };
  }

  // Multiline: keep consuming lines until closing quote
  const parts = [buf];
  for (let j = nextLineIndex; j < allLines.length; j++) {
    linesConsumed++;
    const nextLine = allLines[j];
    const idx = findUnescapedQuote(nextLine, '"');
    if (idx !== -1) {
      parts.push(nextLine.slice(0, idx));
      return { parsed: unescapeDoubleQuoted(parts.join("\n")), linesConsumed };
    }
    parts.push(nextLine);
  }

  // No closing quote found — treat entire remainder as the value
  return { parsed: unescapeDoubleQuoted(parts.join("\n")), linesConsumed };
}

/** Parse a single-quoted value (literal, no escapes). */
function parseSingleQuoted(
  firstLine: string,
  allLines: string[],
  nextLineIndex: number
): { parsed: string; linesConsumed: number } {
  let buf = firstLine.slice(1);
  let linesConsumed = 0;

  const closeIdx = buf.indexOf("'");
  if (closeIdx !== -1) {
    return { parsed: buf.slice(0, closeIdx), linesConsumed: 0 };
  }

  const parts = [buf];
  for (let j = nextLineIndex; j < allLines.length; j++) {
    linesConsumed++;
    const nextLine = allLines[j];
    const idx = nextLine.indexOf("'");
    if (idx !== -1) {
      parts.push(nextLine.slice(0, idx));
      return { parsed: parts.join("\n"), linesConsumed };
    }
    parts.push(nextLine);
  }

  return { parsed: parts.join("\n"), linesConsumed };
}

/** Parse a backtick-quoted value (literal, no escapes). */
function parseBacktickQuoted(
  firstLine: string,
  allLines: string[],
  nextLineIndex: number
): { parsed: string; linesConsumed: number } {
  let buf = firstLine.slice(1);
  let linesConsumed = 0;

  const closeIdx = buf.indexOf("`");
  if (closeIdx !== -1) {
    return { parsed: buf.slice(0, closeIdx), linesConsumed: 0 };
  }

  const parts = [buf];
  for (let j = nextLineIndex; j < allLines.length; j++) {
    linesConsumed++;
    const nextLine = allLines[j];
    const idx = nextLine.indexOf("`");
    if (idx !== -1) {
      parts.push(nextLine.slice(0, idx));
      return { parsed: parts.join("\n"), linesConsumed };
    }
    parts.push(nextLine);
  }

  return { parsed: parts.join("\n"), linesConsumed };
}

/** Find the index of an unescaped quote character. */
function findUnescapedQuote(str: string, quote: string): number {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\" && i + 1 < str.length) {
      i++; // skip escaped character
      continue;
    }
    if (str[i] === quote) return i;
  }
  return -1;
}

/** Process escape sequences in double-quoted strings. */
function unescapeDoubleQuoted(str: string): string {
  return str.replace(/\\(.)/g, (_, ch) => {
    switch (ch) {
      case "n": return "\n";
      case "r": return "\r";
      case "t": return "\t";
      case "\\": return "\\";
      case '"': return '"';
      case "$": return "$";
      default: return `\\${ch}`;
    }
  });
}

/** Strip inline comment from an unquoted value. */
function stripInlineComment(value: string): string {
  // Inline comments start with # or ; preceded by whitespace
  // We need to find the first # or ; that has a space before it
  for (let i = 1; i < value.length; i++) {
    if ((value[i] === "#" || value[i] === ";") && value[i - 1] === " ") {
      return value.slice(0, i).trimEnd();
    }
  }
  return value.trim();
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
  if (value.includes("\n") || value.includes("\r")) {
    // Multiline values must be double-quoted with escaped newlines
    return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
  }
  return /[\s#;"]/.test(value) ? JSON.stringify(value) : value;
}
