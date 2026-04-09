/**
 * Unit tests for the hash chain service.
 * These tests are self-contained — no database or running server required.
 */

import { describe, it, expect } from "vitest";
import {
  sha256,
  computeInputHash,
  computeContentHash,
  verifyContentHash,
  computeMerkleRoot,
} from "../services/hashChain.js";

// ─── sha256 ────────────────────────────────────────────────────

describe("sha256", () => {
  it("produces a 64-char hex string", () => {
    expect(sha256("hello")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
  });

  it("different inputs produce different hashes", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });

  it("matches known SHA-256 vector", () => {
    // echo -n "" | sha256sum → e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

// ─── computeInputHash ──────────────────────────────────────────

describe("computeInputHash", () => {
  it("returns a 64-char hex string", () => {
    expect(computeInputHash({ amount: 100, currency: "USD" })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same payload", () => {
    const payload = { amount: 500, currency: "EUR", recipient: "Acme" };
    expect(computeInputHash(payload)).toBe(computeInputHash(payload));
  });

  it("different payloads produce different hashes", () => {
    expect(computeInputHash({ amount: 100 })).not.toBe(computeInputHash({ amount: 101 }));
  });

  it("equals sha256 of JSON.stringify(payload)", () => {
    const payload = { amount: 42, currency: "GBP" };
    expect(computeInputHash(payload)).toBe(sha256(JSON.stringify(payload)));
  });
});

// ─── computeContentHash ────────────────────────────────────────

const BASE_PARAMS = {
  inputHash: sha256("test-input"),
  outputPayload: { decision: "approved", confidence: 0.95 },
  decision: "approved",
  occurredAt: "2026-04-08T12:00:00.000Z",
};

describe("computeContentHash", () => {
  it("returns a 64-char hex string", () => {
    expect(computeContentHash(BASE_PARAMS)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(computeContentHash(BASE_PARAMS)).toBe(computeContentHash(BASE_PARAMS));
  });

  it("changes when inputHash changes", () => {
    const modified = { ...BASE_PARAMS, inputHash: sha256("different-input") };
    expect(computeContentHash(BASE_PARAMS)).not.toBe(computeContentHash(modified));
  });

  it("changes when decision changes", () => {
    const modified = { ...BASE_PARAMS, decision: "rejected" };
    expect(computeContentHash(BASE_PARAMS)).not.toBe(computeContentHash(modified));
  });

  it("changes when occurredAt changes", () => {
    const modified = { ...BASE_PARAMS, occurredAt: "2026-04-09T00:00:00.000Z" };
    expect(computeContentHash(BASE_PARAMS)).not.toBe(computeContentHash(modified));
  });

  it("changes when outputPayload changes", () => {
    const modified = { ...BASE_PARAMS, outputPayload: { decision: "approved", confidence: 0.99 } };
    expect(computeContentHash(BASE_PARAMS)).not.toBe(computeContentHash(modified));
  });

  it("is stable across JSONB key-ordering variations (canonical JSON)", () => {
    // Simulates PostgreSQL JSONB reordering keys alphabetically
    const paramsAB = {
      ...BASE_PARAMS,
      outputPayload: { a: 1, b: 2 },
    };
    const paramsBA = {
      ...BASE_PARAMS,
      outputPayload: { b: 2, a: 1 },
    };
    // Canonical JSON sorts keys, so both produce identical hashes
    expect(computeContentHash(paramsAB)).toBe(computeContentHash(paramsBA));
  });

  it("canonical JSON handles nested objects", () => {
    const paramsNested = {
      ...BASE_PARAMS,
      outputPayload: { z: { b: 1, a: 2 }, y: true },
    };
    const paramsNestedSwapped = {
      ...BASE_PARAMS,
      outputPayload: { y: true, z: { a: 2, b: 1 } },
    };
    expect(computeContentHash(paramsNested)).toBe(computeContentHash(paramsNestedSwapped));
  });

  it("canonical JSON handles arrays (preserves order)", () => {
    const withArr1 = { ...BASE_PARAMS, outputPayload: { items: [1, 2, 3] } };
    const withArr2 = { ...BASE_PARAMS, outputPayload: { items: [3, 2, 1] } };
    // Array order is significant — different order must produce different hash
    expect(computeContentHash(withArr1)).not.toBe(computeContentHash(withArr2));
  });

  it("canonical JSON handles null outputPayload", () => {
    const paramsNull = { ...BASE_PARAMS, outputPayload: null };
    expect(computeContentHash(paramsNull)).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── verifyContentHash ─────────────────────────────────────────

describe("verifyContentHash", () => {
  it("returns true for a valid hash", () => {
    const hash = computeContentHash(BASE_PARAMS);
    expect(verifyContentHash(hash, BASE_PARAMS)).toBe(true);
  });

  it("returns false for a tampered hash", () => {
    const hash = computeContentHash(BASE_PARAMS);
    const tampered = hash.replace(hash[0], hash[0] === "a" ? "b" : "a");
    expect(verifyContentHash(tampered, BASE_PARAMS)).toBe(false);
  });

  it("returns false when decision does not match", () => {
    const hash = computeContentHash(BASE_PARAMS);
    const modified = { ...BASE_PARAMS, decision: "rejected" };
    expect(verifyContentHash(hash, modified)).toBe(false);
  });

  it("returns false when occurredAt does not match", () => {
    const hash = computeContentHash(BASE_PARAMS);
    const modified = { ...BASE_PARAMS, occurredAt: "2026-01-01T00:00:00.000Z" };
    expect(verifyContentHash(hash, modified)).toBe(false);
  });
});

// ─── computeMerkleRoot ─────────────────────────────────────────

describe("computeMerkleRoot", () => {
  it("returns a 64-char hex string for empty array", () => {
    expect(computeMerkleRoot([])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the single hash unchanged for one-element array", () => {
    const h = sha256("single");
    expect(computeMerkleRoot([h])).toBe(h);
  });

  it("is deterministic", () => {
    const hashes = [sha256("a"), sha256("b"), sha256("c")];
    expect(computeMerkleRoot(hashes)).toBe(computeMerkleRoot(hashes));
  });

  it("returns a 64-char hex string for even-length arrays", () => {
    const hashes = [sha256("a"), sha256("b"), sha256("c"), sha256("d")];
    expect(computeMerkleRoot(hashes)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a 64-char hex string for odd-length arrays", () => {
    const hashes = [sha256("a"), sha256("b"), sha256("c")];
    expect(computeMerkleRoot(hashes)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different sets of hashes produce different roots", () => {
    const h1 = computeMerkleRoot([sha256("a"), sha256("b")]);
    const h2 = computeMerkleRoot([sha256("a"), sha256("c")]);
    expect(h1).not.toBe(h2);
  });

  it("order matters — [a, b] ≠ [b, a]", () => {
    const ha = sha256("a");
    const hb = sha256("b");
    expect(computeMerkleRoot([ha, hb])).not.toBe(computeMerkleRoot([hb, ha]));
  });

  it("correctly handles two-level tree (4 leaves)", () => {
    const leaves = ["a", "b", "c", "d"].map(sha256);
    const root = computeMerkleRoot(leaves);
    // Manually compute: sha256(sha256(sha256(a)+sha256(b)) + sha256(sha256(c)+sha256(d)))
    const ab = sha256(leaves[0] + leaves[1]);
    const cd = sha256(leaves[2] + leaves[3]);
    const expected = sha256(ab + cd);
    expect(root).toBe(expected);
  });
});
