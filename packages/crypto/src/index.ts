const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface EncryptedPayload {
  algorithm: "AES-GCM";
  iv: string;
  ciphertext: string;
}

export interface EncryptedRevisionPayload {
  ciphertext: string;
  wrappedDataKey: string;
  contentHash: string;
}

export interface DeviceKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export interface EncryptedVaultPayload {
  algorithm: "AES-GCM-PBKDF2";
  salt: string;
  iv: string;
  ciphertext: string;
  iterations: number;
}

export interface WorkspaceBootstrap {
  workspaceKey: string;
  recoveryPhrase: string;
}

export async function bootstrapWorkspace(): Promise<WorkspaceBootstrap> {
  const rawKey = randomBytes(32);
  const workspaceKey = base64UrlEncode(rawKey);
  return {
    workspaceKey,
    recoveryPhrase: encodeRecoveryPhrase(rawKey)
  };
}

export async function hashContent(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function encryptRevisionPayload(plaintext: string, workspaceKey: string): Promise<EncryptedRevisionPayload> {
  const dataKeyBytes = randomBytes(32);
  const dataKey = await importAesGcmKey(dataKeyBytes, ["encrypt"]);
  const iv = randomBytes(12);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    dataKey,
    textEncoder.encode(plaintext)
  );

  const wrappingKey = await importAesKwKey(base64UrlDecode(workspaceKey), ["wrapKey"]);
  const exportableDataKey = await importAesGcmKey(dataKeyBytes, ["encrypt", "decrypt"]);
  const wrapped = await crypto.subtle.wrapKey("raw", exportableDataKey, wrappingKey, "AES-KW");

  return {
    ciphertext: serializeEncryptedPayload({
      algorithm: "AES-GCM",
      iv: base64UrlEncode(iv),
      ciphertext: base64UrlEncode(new Uint8Array(encrypted))
    }),
    wrappedDataKey: base64UrlEncode(new Uint8Array(wrapped)),
    contentHash: await hashContent(plaintext)
  };
}

export async function decryptRevisionPayload(payload: EncryptedRevisionPayload, workspaceKey: string): Promise<string> {
  const envelope = deserializeEncryptedPayload(payload.ciphertext);
  const wrappingKey = await importAesKwKey(base64UrlDecode(workspaceKey), ["unwrapKey"]);

  const dataKey = await crypto.subtle.unwrapKey(
    "raw",
    toBufferSource(base64UrlDecode(payload.wrappedDataKey)),
    wrappingKey,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(base64UrlDecode(envelope.iv)) },
    dataKey,
    toBufferSource(base64UrlDecode(envelope.ciphertext))
  );

  return textDecoder.decode(plaintext);
}

export async function generateDeviceKeyPair(): Promise<DeviceKeyPair> {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["wrapKey", "unwrapKey"]
  );

  return {
    publicKey: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey)
  };
}

export async function wrapWorkspaceKeyForDevice(workspaceKey: string, publicKey: JsonWebKey): Promise<string> {
  const recipient = await crypto.subtle.importKey(
    "jwk",
    publicKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["wrapKey"]
  );
  const workspaceCryptoKey = await importAesKwKey(base64UrlDecode(workspaceKey), ["wrapKey"]);
  const wrapped = await crypto.subtle.wrapKey("raw", workspaceCryptoKey, recipient, "RSA-OAEP");
  return base64UrlEncode(new Uint8Array(wrapped));
}

export async function unwrapWorkspaceKeyForDevice(wrappedWorkspaceKey: string, privateKey: JsonWebKey): Promise<string> {
  const recipient = await crypto.subtle.importKey(
    "jwk",
    privateKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["unwrapKey"]
  );
  const key = await crypto.subtle.unwrapKey(
    "raw",
    toBufferSource(base64UrlDecode(wrappedWorkspaceKey)),
    recipient,
    "RSA-OAEP",
    { name: "AES-KW", length: 256 },
    true,
    ["wrapKey", "unwrapKey"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  return base64UrlEncode(new Uint8Array(raw));
}

export function restoreWorkspaceKeyFromRecoveryPhrase(recoveryPhrase: string): string {
  const normalized = recoveryPhrase.replaceAll("-", "").replaceAll(" ", "").toUpperCase();
  return base64UrlEncode(base32Decode(normalized));
}

export function encodeRecoveryPhrase(rawKey: Uint8Array): string {
  const encoded = base32Encode(rawKey);
  return encoded.match(/.{1,4}/g)?.join("-") ?? encoded;
}

export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

export function deserializeEncryptedPayload(payload: string): EncryptedPayload {
  const parsed = JSON.parse(payload) as EncryptedPayload;
  if (parsed.algorithm !== "AES-GCM") {
    throw new Error("Unsupported payload algorithm");
  }
  return parsed;
}

export async function encryptVaultPayload(plaintext: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const iterations = 250_000;
  const key = await derivePassphraseKey(passphrase, salt, iterations, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    key,
    textEncoder.encode(plaintext)
  );

  const payload: EncryptedVaultPayload = {
    algorithm: "AES-GCM-PBKDF2",
    salt: base64UrlEncode(salt),
    iv: base64UrlEncode(iv),
    ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
    iterations
  };

  return JSON.stringify(payload);
}

export async function decryptVaultPayload(payload: string, passphrase: string): Promise<string> {
  const parsed = JSON.parse(payload) as EncryptedVaultPayload;
  if (parsed.algorithm !== "AES-GCM-PBKDF2") {
    throw new Error("Unsupported vault payload");
  }

  const key = await derivePassphraseKey(
    passphrase,
    base64UrlDecode(parsed.salt),
    parsed.iterations,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(base64UrlDecode(parsed.iv)) },
    key,
    toBufferSource(base64UrlDecode(parsed.ciphertext))
  );

  return textDecoder.decode(plaintext);
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function importAesGcmKey(rawKey: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toBufferSource(rawKey), { name: "AES-GCM", length: 256 }, true, usages);
}

async function importAesKwKey(rawKey: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toBufferSource(rawKey), { name: "AES-KW", length: 256 }, true, usages);
}

async function derivePassphraseKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", textEncoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey"
  ]);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toBufferSource(salt),
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usages
  );
}

function base64UrlEncode(value: Uint8Array): string {
  return base64Encode(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return base64Decode(normalized + padding);
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(input: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of input) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error("Invalid recovery phrase");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

function base64Encode(value: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value).toString("base64");
  }

  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64Decode(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  return new Uint8Array([...binary].map((character) => character.charCodeAt(0)));
}

function toBufferSource(value: Uint8Array): BufferSource {
  return Uint8Array.from(value) as unknown as BufferSource;
}
