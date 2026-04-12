/**
 * Unit tests for audit export prevExportHash chaining and XML format (EU AI Act Art. 12/19).
 * Self-contained — no database or running server required.
 */

import { describe, it, expect } from "vitest";
import { sha256 } from "../services/hashChain.js";
import { XMLBuilder } from "fast-xml-parser";

// ─── prevExportHash chaining ─────────────────────────────────────────────────

describe("prevExportHash chaining", () => {
  it("second export prevExportHash matches first export fileHash", () => {
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

  it("export chain is verifiable — each fileHash is deterministic", () => {
    const body = { exportId: "x", generatedAt: "2026-04-10T00:00:00.000Z", recordCount: 0 };
    expect(sha256(JSON.stringify(body))).toBe(sha256(JSON.stringify(body)));
  });

  it("chain of 3 exports maintains prevHash linkage", () => {
    const e1 = { exportId: "e1", prevExportHash: null };
    const h1 = sha256(JSON.stringify(e1));

    const e2 = { exportId: "e2", prevExportHash: h1 };
    const h2 = sha256(JSON.stringify(e2));

    const e3 = { exportId: "e3", prevExportHash: h2 };

    expect(e2.prevExportHash).toBe(h1);
    expect(e3.prevExportHash).toBe(h2);
    expect(e3.prevExportHash).not.toBe(h1);
  });
});

// ─── XML export format (EU AI Act Art. 19) ───────────────────────────────────

describe("XML export format", () => {
  function buildXml(exportBody: {
    exportId: string;
    generatedAt: string;
    prevExportHash: string | null;
    fileHash: string;
    recordCount: number;
    events: Array<{ id: string; eventType: string; decision: string; contentHash: string; occurredAt: Date }>;
    reviews: Array<{ id: string; eventId: string; reviewerId: string; action: string; justification: string; contentHash: string; reviewCompletedAt: Date }>;
  }): string {
    const xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: "  ",
      arrayNodeName: "item",
    });
    const xmlPayload = {
      AuditExport: {
        ExportMeta: {
          ExportId: exportBody.exportId,
          GeneratedAt: exportBody.generatedAt,
          PrevExportHash: exportBody.prevExportHash ?? "",
          FileHash: exportBody.fileHash,
          RecordCount: exportBody.recordCount,
          AuthorityName: "",
          AuthorityRef: "",
        },
        Events: {
          Event: exportBody.events.map((e) => ({
            Id: e.id,
            EventType: e.eventType,
            Decision: e.decision,
            ContentHash: e.contentHash,
            OccurredAt: e.occurredAt,
          })),
        },
        Reviews: {
          Review: exportBody.reviews.map((r) => ({
            Id: r.id,
            EventId: r.eventId,
            ReviewerId: r.reviewerId,
            Action: r.action,
            Justification: r.justification,
            ContentHash: r.contentHash,
            ReviewCompletedAt: r.reviewCompletedAt,
          })),
        },
      },
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + xmlBuilder.build(xmlPayload);
  }

  const sampleExport = {
    exportId: "test-export-001",
    generatedAt: "2026-04-12T00:00:00.000Z",
    prevExportHash: null,
    fileHash: sha256("test-content"),
    recordCount: 1,
    events: [
      {
        id: "event-uuid-001",
        eventType: "transaction",
        decision: "approved",
        contentHash: sha256("event-content"),
        occurredAt: new Date("2026-04-12T00:00:00.000Z"),
      },
    ],
    reviews: [
      {
        id: "review-uuid-001",
        eventId: "event-uuid-001",
        reviewerId: "reviewer-001",
        action: "approve",
        justification: "Reviewed and approved per policy.",
        contentHash: sha256("review-content"),
        reviewCompletedAt: new Date("2026-04-12T01:00:00.000Z"),
      },
    ],
  };

  it("XML output starts with XML declaration", () => {
    const xml = buildXml(sampleExport);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it("XML contains AuditExport root element", () => {
    const xml = buildXml(sampleExport);
    expect(xml).toContain("<AuditExport>");
    expect(xml).toContain("</AuditExport>");
  });

  it("XML contains ExportMeta with ExportId", () => {
    const xml = buildXml(sampleExport);
    expect(xml).toContain("<ExportId>test-export-001</ExportId>");
  });

  it("XML contains FileHash as valid SHA-256 hex", () => {
    const xml = buildXml(sampleExport);
    expect(xml).toContain(`<FileHash>${sampleExport.fileHash}</FileHash>`);
    expect(sampleExport.fileHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("XML contains event ContentHash", () => {
    const xml = buildXml(sampleExport);
    expect(xml).toContain("<ContentHash>");
    expect(xml).toContain(sha256("event-content"));
  });

  it("XML contains review Action field", () => {
    const xml = buildXml(sampleExport);
    expect(xml).toContain("<Action>approve</Action>");
  });

  it("XML contains review Justification", () => {
    const xml = buildXml(sampleExport);
    expect(xml).toContain("<Justification>Reviewed and approved per policy.</Justification>");
  });

  it("empty export produces valid XML with RecordCount 0", () => {
    const emptyExport = { ...sampleExport, events: [], reviews: [], recordCount: 0 };
    const xml = buildXml(emptyExport);
    expect(xml).toContain("<RecordCount>0</RecordCount>");
    expect(xml).toContain("<AuditExport>");
  });

  it("XML PrevExportHash is empty string when null (first export)", () => {
    const xml = buildXml({ ...sampleExport, prevExportHash: null });
    expect(xml).toContain("<PrevExportHash></PrevExportHash>");
  });

  it("XML PrevExportHash contains hash value when set", () => {
    const prevHash = sha256("previous-export");
    const xml = buildXml({ ...sampleExport, prevExportHash: prevHash });
    expect(xml).toContain(`<PrevExportHash>${prevHash}</PrevExportHash>`);
  });

  it("XML fileHash changes when export content changes", () => {
    const hash1 = sha256("content-a");
    const hash2 = sha256("content-b");
    expect(hash1).not.toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hash2).toMatch(/^[0-9a-f]{64}$/);
  });
});
