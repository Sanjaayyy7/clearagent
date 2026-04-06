import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEvent, type VerificationEvent, type HumanReview } from "../lib/api.ts";
import ReviewForm from "../components/ReviewForm.tsx";

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

const decisionColors: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  flagged: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<(VerificationEvent & { humanReviews: HumanReview[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getEvent(id)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load event"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-brand-muted">Loading event...</div>;
  }

  if (error || !event) {
    return (
      <div className="text-center mt-20">
        <p className="text-red-400 mb-4">{error || "Event not found"}</p>
        <button onClick={() => navigate("/")} className="text-brand-accent text-sm hover:underline">
          Back to Live Feed
        </button>
      </div>
    );
  }

  const conf = event.confidence !== null ? (Number(event.confidence) * 100).toFixed(1) + "%" : "n/a";
  const needsReview = event.requiresReview && event.humanReviews.length === 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate("/")} className="text-brand-muted hover:text-brand-text text-sm">
          ← Back
        </button>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-text mb-1">Verification Event</h2>
            <code className="text-xs text-brand-muted font-mono">{event.id}</code>
          </div>
          <Badge
            label={event.decision.charAt(0).toUpperCase() + event.decision.slice(1)}
            color={decisionColors[event.decision] || "bg-gray-500/15 text-gray-400 border-gray-500/30"}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <p className="text-brand-muted text-xs uppercase tracking-wide">Confidence</p>
            <p className={`font-mono mt-0.5 ${
              Number(event.confidence) >= 0.85 ? "text-emerald-400" :
              Number(event.confidence) >= 0.5 ? "text-amber-400" : "text-red-400"
            }`}>{conf}</p>
          </div>
          <div>
            <p className="text-brand-muted text-xs uppercase tracking-wide">Event Type</p>
            <p className="mt-0.5">{event.eventType}</p>
          </div>
          <div>
            <p className="text-brand-muted text-xs uppercase tracking-wide">Occurred At</p>
            <p className="mt-0.5 text-xs">{new Date(event.occurredAt).toLocaleString()}</p>
          </div>
        </div>
        {event.requiresReview && (
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-amber-400 text-xs">Human review required (EU AI Act Art. 14)</span>
          </div>
        )}
      </div>

      {/* Input / Output */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide mb-2">Input Payload</p>
          <pre className="text-xs font-mono text-brand-text whitespace-pre-wrap break-all overflow-auto max-h-48">
            {JSON.stringify(event.inputPayload, null, 2)}
          </pre>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide mb-2">Output Payload</p>
          <pre className="text-xs font-mono text-brand-text whitespace-pre-wrap break-all overflow-auto max-h-48">
            {event.outputPayload ? JSON.stringify(event.outputPayload, null, 2) : "—"}
          </pre>
        </div>
      </div>

      {/* Hash chain */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
        <p className="text-xs text-brand-muted uppercase tracking-wide mb-3">Hash Chain (Art. 12)</p>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-brand-muted">Content Hash</p>
            <code className="text-xs font-mono text-emerald-400 break-all">{event.contentHash}</code>
          </div>
          <div>
            <p className="text-xs text-brand-muted">Previous Hash</p>
            <code className="text-xs font-mono text-brand-muted break-all">{event.prevHash ?? "null (first event)"}</code>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {event.reasoning && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide mb-2">Reasoning</p>
          <p className="text-sm text-brand-text">{event.reasoning}</p>
        </div>
      )}

      {/* EU AI Act articles */}
      {event.euAiActArticles && event.euAiActArticles.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-muted">EU AI Act:</span>
          {event.euAiActArticles.map((art) => (
            <Badge key={art} label={art} color="bg-brand-accent/10 text-brand-accent border-brand-accent/30" />
          ))}
        </div>
      )}

      {/* Human reviews */}
      {event.humanReviews.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide mb-3">Human Reviews</p>
          <div className="space-y-3">
            {event.humanReviews.map((review) => (
              <div key={review.id} className="border border-brand-border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium capitalize ${
                    review.action === "approve" ? "text-emerald-400" :
                    review.action === "reject" ? "text-red-400" : "text-amber-400"
                  }`}>{review.action}</span>
                  <span className="text-xs text-brand-muted">{new Date(review.reviewedAt).toLocaleString()}</span>
                </div>
                <p className="text-brand-text text-xs">{review.justification}</p>
                <p className="text-brand-muted text-xs mt-1">
                  {review.reviewerRole} · {review.reviewerEmail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review form */}
      {needsReview && <ReviewForm eventId={event.id} onSuccess={load} />}
    </div>
  );
}
