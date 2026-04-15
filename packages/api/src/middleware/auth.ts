import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

/**
 * API key authentication middleware.
 * Accepts a bearer token or ?api_key= query param, resolves the matching
 * api_keys record by prefix, and bcrypt-compares the raw key to the stored hash.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Accept key from Authorization header OR ?api_key= query param (required for EventSource/SSE)
  const authHeader = req.headers.authorization;
  const queryKey = req.query.api_key as string | undefined;

  if (!authHeader?.startsWith("Bearer ") && !queryKey) {
    res.status(401).json({
      error: {
        code: "authentication_required",
        message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
      },
    });
    return;
  }

  const apiKey = authHeader ? authHeader.slice(7) : queryKey!;
  const keyPrefix = apiKey.slice(0, 12);

  try {
    const candidates = await db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.keyPrefix, keyPrefix), eq(schema.apiKeys.revoked, false)));

    let matchedKey: typeof candidates[number] | null = null;
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(apiKey, candidate.keyHash);
      if (isMatch) {
        matchedKey = candidate;
        break;
      }
    }

    if (!matchedKey) {
      res.status(401).json({
        error: {
          code: "invalid_api_key",
          message: "Invalid API key",
        },
      });
      return;
    }

    await db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, matchedKey.id));

    (req as any).auth = {
      orgId: matchedKey.orgId,
      agentId: matchedKey.agentId,
      apiKeyId: matchedKey.id,
      apiKey: apiKey,
    };

    next();
  } catch (err) {
    next(err);
  }
}
