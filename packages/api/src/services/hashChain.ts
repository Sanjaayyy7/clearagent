import { createHash } from "node:crypto";

/**
 * Compute SHA-256 hash of a string.
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute the input hash (SHA-256 of the stringified input payload).
 * This is stored instead of raw input for privacy-safe logging.
 */
export function computeInputHash(inputPayload: unknown): string {
  return sha256(JSON.stringify(inputPayload));
}

/**
 * Canonically serialize a value for hashing.
 * Sorts object keys to ensure deterministic output regardless of insertion order
 * (necessary because PostgreSQL JSONB storage reorders keys).
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
    .join(",");
  return `{${sorted}}`;
}

/**
 * Compute the content hash for a verification event.
 * This is the hash that forms the chain: hash(inputHash + outputPayload + decision + occurredAt).
 * Uses canonical JSON serialization (sorted keys) to survive JSONB roundtrips.
 */
export function computeContentHash(params: {
  inputHash: string;
  outputPayload: unknown;
  decision: string;
  occurredAt: string;
}): string {
  const data = [
    params.inputHash,
    canonicalJson(params.outputPayload),
    params.decision,
    params.occurredAt,
  ].join("|");
  return sha256(data);
}

/**
 * Verify that a content hash is valid given its components.
 */
export function verifyContentHash(
  contentHash: string,
  params: {
    inputHash: string;
    outputPayload: unknown;
    decision: string;
    occurredAt: string;
  }
): boolean {
  return computeContentHash(params) === contentHash;
}

/**
 * Compute a Merkle root from an array of content hashes.
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256("");
  if (hashes.length === 1) return hashes[0];

  const nextLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = i + 1 < hashes.length ? hashes[i + 1] : left;
    nextLevel.push(sha256(left + right));
  }
  return computeMerkleRoot(nextLevel);
}
