import { describe, expect, test } from "bun:test";
import { envEntriesToObject, normalizeEnvDocument, parseEnvDocument, stringifyEnvEntries } from "./index";

describe("env format", () => {
  test("parses duplicate keys with last write winning", () => {
    const entries = parseEnvDocument(`
      # comment
      API_URL=https://example.com
      TOKEN=abc
      TOKEN=def
    `);

    expect(entries).toEqual([
      { key: "API_URL", value: "https://example.com" },
      { key: "TOKEN", value: "def" }
    ]);
  });

  test("normalizes sorted output", () => {
    expect(normalizeEnvDocument("B=2\nA=1\n")).toBe("A=1\nB=2\n");
  });

  test("stringifies values with spaces safely", () => {
    expect(
      stringifyEnvEntries([
        { key: "GREETING", value: "hello world" },
        { key: "TOKEN", value: "abc123" }
      ])
    ).toBe('GREETING="hello world"\nTOKEN=abc123\n');
  });

  test("converts entries to object", () => {
    expect(envEntriesToObject([{ key: "A", value: "1" }])).toEqual({ A: "1" });
  });
});

