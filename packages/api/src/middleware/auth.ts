import type { Request, Response, NextFunction } from "express";

/**
 * API key authentication middleware.
 * For MVP: checks against a single hardcoded demo key from env.
 * Production: would hash-compare against api_keys table.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
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
  const demoKey = process.env.DEMO_API_KEY || "ca_test_demo_key_clearagent_2026";

  if (apiKey !== demoKey) {
    res.status(401).json({
      error: {
        code: "invalid_api_key",
        message: "Invalid API key",
      },
    });
    return;
  }

  // Attach auth context to request
  (req as any).auth = {
    orgId: null, // Will be set after seed
    agentId: null,
    apiKey: apiKey,
  };

  next();
}
