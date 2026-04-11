export const VERSION = "0.2.0";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ClearAgentConfig {
  apiKey: string;
  baseUrl?: string;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface VerificationEvent {
  id: string;
  orgId: string;
  agentId: string;
  eventType: string;
  eventCategory: string;
  inputHash: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown> | null;
  decision: string;
  confidence: number | null;
  reasoning: string | null;
  sessionId: string | null;
  parentEventId: string | null;
  sequenceNum: number;
  euAiActArticles: string[];
  riskIndicators: Record<string, unknown>;
  contentHash: string;
  prevHash: string | null;
  occurredAt: string;
  recordedAt: string;
  retentionExpiresAt: string;
  status: string;
  requiresReview: boolean;
  humanReviews?: HumanReview[];
}

export interface HumanReview {
  id: string;
  orgId: string;
  eventId: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerRole: string;
  action: "approve" | "reject" | "override";
  originalDecision: string;
  overrideDecision?: string;
  justification: string;
  escalatedFrom?: string;
  escalationReason?: string;
  reviewRequestedAt: string;
  reviewCompletedAt: string;
  reviewSlaMs?: number;
  contentHash: string;
}

export interface Job {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  eventId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredAgent {
  agentId: string;
  apiKey: string;
  status: string;
  registeredAt: string;
}

export interface CompletedJob extends Job {
  status: "completed";
  eventId: string;
  contentHash: string;
  requiresReview: boolean;
}

export interface Agent {
  agentId: string;
  name: string;
  externalId: string;
  status: string;
  registeredAt: string;
}

export interface AuditIntegrity {
  totalEvents: number;
  validChain: boolean;
  merkleRoot: string;
  checkedAt: string;
  brokenAt: string | null;
}

export interface AuditExport {
  exportId: string;
  generatedAt: string;
  fileHash: string;
  recordCount: number;
  filters: Record<string, unknown>;
  events: VerificationEvent[];
  reviews: HumanReview[];
}

export interface EventsListResponse {
  data: VerificationEvent[];
  pagination: {
    total: number;
    limit: number;
    offset?: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface PollOptions {
  /** Maximum number of polling attempts. Default: 30 */
  maxAttempts?: number;
  /** Milliseconds between attempts. Default: 500 */
  intervalMs?: number;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class ClearAgentError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ClearAgentError";
  }
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ClearAgentConfig) {
    this.baseUrl = (config.baseUrl ?? "http://localhost:3000").replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errObj = payload["error"] as Record<string, unknown> | undefined;
      throw new ClearAgentError(
        (errObj?.["message"] as string | undefined) ?? res.statusText,
        res.status,
        errObj?.["code"] as string | undefined
      );
    }

    return res.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }
}

// ─── Resource classes ─────────────────────────────────────────────────────────

class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  register(data: {
    name: string;
    externalId: string;
    modelProvider?: string;
    modelId?: string;
    description?: string;
  }): Promise<RegisteredAgent> {
    return this.http.post<RegisteredAgent>("/v1/agents/register", data);
  }

  suspend(agentId: string): Promise<{ agentId: string; status: string }> {
    return this.http.patch(`/v1/agents/${agentId}/status`, { status: "suspended" });
  }

  activate(agentId: string): Promise<{ agentId: string; status: string }> {
    return this.http.patch(`/v1/agents/${agentId}/status`, { status: "active" });
  }

  flag(agentId: string): Promise<{ agentId: string; status: string }> {
    return this.http.patch(`/v1/agents/${agentId}/status`, { status: "flagged" });
  }
}

class EventsResource {
  constructor(private readonly http: HttpClient) {}

  verify(data: {
    input: Record<string, unknown>;
    eventType?: string;
    eventCategory?: string;
    agentId?: string;
    sessionId?: string;
    parentEventId?: string;
    sequenceNum?: number;
  }): Promise<{ jobId: string; status: string }> {
    return this.http.post("/v1/events/verify", data);
  }

  get(eventId: string): Promise<VerificationEvent> {
    return this.http.get<VerificationEvent>(`/v1/events/${eventId}`);
  }

  list(filters?: {
    agentId?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  }): Promise<EventsListResponse> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.set("agent_id", filters.agentId);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.limit !== undefined) params.set("limit", String(filters.limit));
    if (filters?.cursor) params.set("cursor", filters.cursor);
    const qs = params.toString();
    return this.http.get<EventsListResponse>(`/v1/events${qs ? `?${qs}` : ""}`);
  }
}

class JobsResource {
  constructor(private readonly http: HttpClient) {}

  get(jobId: string): Promise<Job> {
    return this.http.get<Job>(`/v1/jobs/${jobId}`);
  }

  async poll(jobId: string, options: PollOptions = {}): Promise<CompletedJob> {
    const { maxAttempts = 30, intervalMs = 500 } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const job = await this.get(jobId);

      if (job.status === "completed" && job.eventId) {
        const event = await this.http.get<VerificationEvent>(`/v1/events/${job.eventId}`);
        return {
          ...job,
          status: "completed",
          eventId: job.eventId,
          contentHash: event.contentHash,
          requiresReview: event.requiresReview,
        };
      }

      if (job.status === "failed") {
        throw new ClearAgentError(
          job.error ?? "Verification job failed",
          500,
          "verification_failed"
        );
      }

      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new ClearAgentError(
      `Job ${jobId} did not complete after ${maxAttempts} attempts`,
      408,
      "poll_timeout"
    );
  }
}

class ReviewsResource {
  constructor(private readonly http: HttpClient) {}

  submit(data: {
    eventId: string;
    action: "approve" | "reject" | "override";
    justification: string;
    reviewerId: string;
    reviewerEmail: string;
    reviewerRole: string;
    overrideDecision?: string;
  }): Promise<HumanReview> {
    return this.http.post<HumanReview>("/v1/reviews", data);
  }
}

class AuditResource {
  constructor(private readonly http: HttpClient) {}

  integrity(): Promise<AuditIntegrity> {
    return this.http.get<AuditIntegrity>("/v1/audit/integrity");
  }

  export(filters?: {
    agentId?: string;
    status?: string;
    from?: string;
    to?: string;
    authorityName?: string;
    authorityRef?: string;
  }): Promise<AuditExport> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.set("agent_id", filters.agentId);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.authorityName) params.set("authority_name", filters.authorityName);
    if (filters?.authorityRef) params.set("authority_ref", filters.authorityRef);
    const qs = params.toString();
    return this.http.get<AuditExport>(`/v1/audit/export${qs ? `?${qs}` : ""}`);
  }
}

// ─── Main client ──────────────────────────────────────────────────────────────

export class ClearAgentClient {
  readonly agents: AgentsResource;
  readonly events: EventsResource;
  readonly jobs: JobsResource;
  readonly reviews: ReviewsResource;
  readonly audit: AuditResource;

  constructor(config: ClearAgentConfig) {
    const http = new HttpClient(config);
    this.agents = new AgentsResource(http);
    this.events = new EventsResource(http);
    this.jobs = new JobsResource(http);
    this.reviews = new ReviewsResource(http);
    this.audit = new AuditResource(http);
  }
}

export default ClearAgentClient;
