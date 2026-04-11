import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEvent, type HumanReview, type VerificationEvent } from "../lib/api.ts";
import ReviewForm from "../components/ReviewForm.tsx";
import { BODY, HEADING, SectionLabel, contentWidth, ErrorState, LoadingState } from "../theme.tsx";

function badgeTone(decision: string) {
  if (decision === "approved") return "dashboard-badge dashboard-badge-success";
  if (decision === "flagged") return "dashboard-badge dashboard-badge-warning";
  if (decision === "rejected" || decision === "failed") return "dashboard-badge dashboard-badge-danger";
  return "dashboard-badge dashboard-badge-neutral";
}

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

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingState label="Loading verification event..." />;
  }

  if (error || !event) {
    return (
      <ErrorState
        label={error || "Event not found"}
        action={
          <button type="button" onClick={() => navigate("/")} className="dashboard-text-link" style={{ marginTop: 12 }}>
            Back to Live Feed
          </button>
        }
      />
    );
  }

  const confidence = event.confidence !== null ? `${(Number(event.confidence) * 100).toFixed(1)}%` : "n/a";
  const needsReview = event.requiresReview && event.humanReviews.length === 0;

  return (
    <section className="dashboard-page">
      <div style={contentWidth()}>
        <button type="button" onClick={() => navigate("/")} className="dashboard-text-link" style={{ marginBottom: 20 }}>
          ← Back to Live Feed
        </button>

        <div className="dashboard-card dashboard-hero-card">
          <div className="dashboard-page-intro dashboard-page-intro-split">
            <div>
              <SectionLabel>Event detail</SectionLabel>
              <div style={{ ...HEADING, fontSize: "clamp(38px, 5vw, 56px)", marginBottom: 14 }}>Verification evidence.</div>
              <p style={{ ...BODY, maxWidth: 760 }}>
                A full record of the model decision, input and output payloads, hash-chain linkage, and oversight state
                rendered in the same product language as the landing page.
              </p>
            </div>
            <span className={badgeTone(event.decision)}>{event.decision}</span>
          </div>

          <div className="dashboard-grid dashboard-grid-three">
            <div>
              <p className="dashboard-card-label">Confidence</p>
              <p className="dashboard-metric-value" style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>
                {confidence}
              </p>
            </div>
            <div>
              <p className="dashboard-card-label">Event Type</p>
              <p className="dashboard-primary-cell" style={{ marginTop: 10 }}>{event.eventType}</p>
            </div>
            <div>
              <p className="dashboard-card-label">Occurred At</p>
              <p className="dashboard-primary-cell" style={{ marginTop: 10 }}>{new Date(event.occurredAt).toLocaleString()}</p>
            </div>
          </div>

          {event.requiresReview ? (
            <div className="dashboard-inline-alert" style={{ marginTop: 24 }}>
              <span className="dashboard-live-dot" />
              <span>Human review required under EU AI Act Article 14.</span>
            </div>
          ) : null}
        </div>

        <div className="dashboard-grid dashboard-grid-two dashboard-detail-grid">
          <div className="dashboard-card">
            <SectionLabel>Input payload</SectionLabel>
            <pre className="dashboard-json-block">{JSON.stringify(event.inputPayload, null, 2)}</pre>
          </div>
          <div className="dashboard-card">
            <SectionLabel>Output payload</SectionLabel>
            <pre className="dashboard-json-block">
              {event.outputPayload ? JSON.stringify(event.outputPayload, null, 2) : "—"}
            </pre>
          </div>
        </div>

        <div className="dashboard-grid dashboard-grid-two dashboard-detail-grid">
          <div className="dashboard-card">
            <SectionLabel>Hash chain</SectionLabel>
            <div className="dashboard-code-block">
              <p className="dashboard-card-label">Content Hash</p>
              <code className="dashboard-hash dashboard-hash-full">{event.contentHash}</code>
            </div>
            <div className="dashboard-code-block">
              <p className="dashboard-card-label">Previous Hash</p>
              <code className="dashboard-hash dashboard-hash-full">{event.prevHash ?? "null (first event)"}</code>
            </div>
          </div>

          <div className="dashboard-card">
            <SectionLabel>Decision context</SectionLabel>
            {event.reasoning ? <p style={{ ...BODY, fontSize: 15, marginBottom: 18 }}>{event.reasoning}</p> : null}
            {event.euAiActArticles && event.euAiActArticles.length > 0 ? (
              <div className="dashboard-pill-row">
                {event.euAiActArticles.map((article) => (
                  <span key={article} className="dashboard-badge dashboard-badge-neutral">
                    {article}
                  </span>
                ))}
              </div>
            ) : (
              <p className="dashboard-card-copy">No EU AI Act article labels attached to this event.</p>
            )}
          </div>
        </div>

        {event.humanReviews.length > 0 ? (
          <div className="dashboard-card">
            <SectionLabel>Human reviews</SectionLabel>
            <div className="dashboard-review-stack">
              {event.humanReviews.map((review) => (
                <div key={review.id} className="dashboard-review-item">
                  <div className="dashboard-page-intro-split" style={{ marginBottom: 10 }}>
                    <span className={badgeTone(review.action)}>{review.action}</span>
                    <span className="dashboard-secondary-cell">{new Date(review.reviewCompletedAt).toLocaleString()}</span>
                  </div>
                  <p className="dashboard-primary-cell">{review.justification}</p>
                  <p className="dashboard-card-copy" style={{ marginTop: 8 }}>
                    {review.reviewerRole} · {review.reviewerEmail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {needsReview ? <ReviewForm eventId={event.id} onSuccess={load} /> : null}
      </div>
    </section>
  );
}
