const API_URL = import.meta.env.VITE_API_URL || "";
const API_KEY = import.meta.env.VITE_API_KEY || "ca_test_demo_key_clearagent_2026";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
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

export async function getEvent(id: string): Promise<VerificationEvent & { humanReviews: unknown[] }> {
  return apiFetch(`/v1/events/${id}`);
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
  const url = `${API_URL}/v1/events/stream?api_key=${API_KEY}`;
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
