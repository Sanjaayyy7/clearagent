/**
 * RFC 3161 External Timestamp Anchoring (EU AI Act Art. 12 enhancement)
 *
 * Provides cryptographically verifiable timestamps from a trusted authority.
 * All operations are best-effort — failure never blocks event processing.
 */

const RFC3161_TSA_URL = process.env.RFC3161_TSA_URL ?? "http://timestamp.digicert.com";

export interface TimestampAnchor {
  token: string;
  anchorService: string;
}

/**
 * Request an RFC 3161 timestamp for a content hash.
 * Returns null on any failure — caller must handle gracefully.
 */
export async function requestRFC3161Timestamp(
  contentHash: string
): Promise<TimestampAnchor | null> {
  try {
    const hashBuffer = Buffer.from(contentHash, "hex");
    if (hashBuffer.length !== 32) return null; // SHA-256 must be 32 bytes

    const tsReq = buildTimeStampRequest(hashBuffer);

    const res = await fetch(RFC3161_TSA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/timestamp-query",
        "Content-Length": tsReq.length.toString(),
      },
      body: tsReq,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const tokenBuffer = await res.arrayBuffer();
    const token = Buffer.from(tokenBuffer).toString("base64");

    return { token, anchorService: RFC3161_TSA_URL };
  } catch {
    return null;
  }
}

/**
 * Build a minimal DER-encoded TimeStampReq (RFC 3161 §2.4.1).
 * SHA-256 OID: 2.16.840.1.101.3.4.2.1
 */
export function buildTimeStampRequest(hash: Buffer): Buffer {
  // AlgorithmIdentifier for SHA-256
  const sha256Oid = Buffer.from([
    0x30, 0x0d,                                     // SEQUENCE
    0x06, 0x09,                                     // OID tag + length
    0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, // 2.16.840.1.101.3.4.2.1
    0x05, 0x00,                                     // NULL params
  ]);

  // MessageImprint ::= SEQUENCE { hashAlgorithm, hashedMessage }
  const hashedMessage = Buffer.concat([Buffer.from([0x04, hash.length]), hash]);
  const messageImprintContent = Buffer.concat([sha256Oid, hashedMessage]);
  const messageImprint = Buffer.concat([
    Buffer.from([0x30, messageImprintContent.length]),
    messageImprintContent,
  ]);

  // TimeStampReq ::= SEQUENCE { version INTEGER, messageImprint, certReq BOOLEAN }
  const version = Buffer.from([0x02, 0x01, 0x01]); // INTEGER 1
  const certReq = Buffer.from([0x01, 0x01, 0xff]); // BOOLEAN TRUE

  const content = Buffer.concat([version, messageImprint, certReq]);
  return Buffer.concat([Buffer.from([0x30, content.length]), content]);
}
