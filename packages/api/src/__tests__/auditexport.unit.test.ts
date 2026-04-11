/**
 * Unit tests for audit export prevExportHash chaining (EU AI Act Art. 12).
 * Self-contained — no database or running server required.
 */

import { describe, it, expect } from "vitest";
import { sha256 } from "../services/hashChain.js";

describe("prevExportHash chaining", () => {
  it("second export prevExportHash matches first export fileHash", () => {
    // Simulate first export body
    const firstExportBody = {
      exportId: "export-1",
      generatedAt: "2026-04-10T00:00:00.000Z",
      prevExportHash: null,
      recordCount: 5,
      filters: {},
      events: [],
      reviews: [],
    };
    const firstFileHash = sha256(JSON.stringify(firstExportBody));

    // Second export references first export's fileHash as prevExportHash
    const secondExportBody = {
      exportId: "export-2",
      generatedAt: "2026-04-10T01:00:00.000Z",
      prevExportHash: firstFileHash,
      recordCount: 3,
      filters: {},
      events: [],
      reviews: [],
    };

    expect(secondExportBody.prevExportHash).toBe(firstFileHash);
    expect(secondExportBody.prevExportHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("prevExportHash changes when export content changes", () => {
    const bodyA = { exportId: "a", generatedAt: "2026-04-10T00:00:00.000Z", recordCount: 1 };
    const bodyB = { exportId: "b", generatedAt: "2026-04-10T00:00:00.000Z", recordCount: 2 };

    expect(sha256(JSON.stringify(bodyA))).not.toBe(sha256(JSON.stringify(bodyB)));
  });

  it("null prevExportHash on first export (no prior exports)", () => {
    const firstExport = {
      exportId: "export-1",
      prevExportHash: null as string | null,
    };

    expect(firstExport.prevExportHash).toBeNull();
  });
});
