const API_URL = import.meta.env.VITE_API_URL || "";
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY && import.meta.env.PROD) {
  throw new Error("VITE_API_KEY must be set in production.");
}
const EFFECTIVE_KEY = API_KEY ?? "ca_test_demo_key_clearagent_2026";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${EFFECTIVE_KEY}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error.error?.message || "API request failed");
  }

  return res.json();
}

export interface VerificationEvent {
  id: string;
  eventType: string;
  eventCategory: string;
  decision: string;
  confidence: string | null;
  reasoning: string | null;
  status: string;
  requiresReview: boolean;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown> | null;
  contentHash: string;
  prevHash: string | null;
  occurredAt: string;
  recordedAt: string;
  euAiActArticles: string[];
  agentId: string | null;
}

export interface HumanReview {
  id: string;
  orgId: string;
  eventId: string;
  action: "approve" | "reject" | "override";
  originalDecision: string;
  justification: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerRole: string;
  overrideDecision: string | null;
  reviewRequestedAt: string;
  reviewCompletedAt: string;
  reviewSlaMs?: number | null;
  contentHash: string;
}

export interface AuditIntegrity {
  validChain: boolean;
  totalEvents: number;
  merkleRoot: string | null;
  checkedAt: string;
  brokenAt: string | null;
}

export interface AuditExport {
  exportId: string;
  generatedAt: string;
  fileHash: string;
  recordCount: number;
  filters: {
    agent_id?: string;
    status?: string;
    from?: string;
    to?: string;
    authority_name?: string;
    authority_ref?: string;
    format: string;
  };
  events: VerificationEvent[];
  reviews: HumanReview[];
}

export interface Agent {
  id: string;
  name: string;
  externalId: string;
  status: "active" | "suspended" | "flagged";
  modelProvider: string | null;
  modelId: string | null;
  description: string | null;
  registeredAt: string;
}

export interface EventsResponse {
  data: VerificationEvent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function listEvents(params?: { limit?: number; status?: string }): Promise<EventsResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", String(params.status));
  return apiFetch(`/v1/events?${query}`);
}

export async function getEvent(id: string): Promise<VerificationEvent & { humanReviews: HumanReview[] }> {
  return apiFetch(`/v1/events/${id}`);
}

export async function submitReview(data: {
  eventId: string;
  action: "approve" | "reject" | "override";
  justification: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerRole: string;
  overrideDecision?: string;
}): Promise<HumanReview> {
  return apiFetch("/v1/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAuditIntegrity(): Promise<AuditIntegrity> {
  return apiFetch("/v1/audit/integrity");
}

export async function getAuditExport(params?: {
  authorityName?: string;
  authorityRef?: string;
}): Promise<AuditExport> {
  const query = new URLSearchParams();
  if (params?.authorityName) query.set("authority_name", params.authorityName);
  if (params?.authorityRef) query.set("authority_ref", params.authorityRef);
  const qs = query.toString();
  return apiFetch(`/v1/audit/export${qs ? `?${qs}` : ""}`);
}

export async function getAgents(): Promise<{ agents: Agent[] }> {
  return apiFetch("/v1/agents");
}

export async function registerAgent(data: {
  name: string;
  externalId: string;
  modelProvider?: string;
  modelId?: string;
  description?: string;
}): Promise<{ agentId: string; apiKey: string; status: string; registeredAt: string }> {
  return apiFetch("/v1/agents/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAgentStatus(
  agentId: string,
  status: "active" | "suspended" | "flagged"
): Promise<{ agentId: string; status: string; name: string }> {
  return apiFetch(`/v1/agents/${agentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Connect to the SSE event stream.
 * Returns a cleanup function to close the connection.
 */
export function subscribeToEventStream(
  onEvent: (event: Partial<VerificationEvent>) => void,
  onError?: (err: Event) => void
): () => void {
  // EventSource doesn't support custom headers — pass key as query param for SSE
  const url = `${API_URL}/v1/events/stream?api_key=${EFFECTIVE_KEY}`;
  const source = new EventSource(url);

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type !== "connected") {
        onEvent(data);
      }
    } catch {
      // ignore parse errors for ping comments
    }
  };

  if (onError) source.onerror = onError;

  return () => source.close();
}
