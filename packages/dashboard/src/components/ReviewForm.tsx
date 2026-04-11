import { useState } from "react";
import { submitReview } from "../lib/api.ts";
import { BODY, HEADING, SectionLabel } from "../theme.tsx";

interface ReviewFormProps {
  eventId: string;
  onSuccess: () => void;
}

export default function ReviewForm({ eventId, onSuccess }: ReviewFormProps) {
  const [action, setAction] = useState<"approve" | "reject" | "override">("approve");
  const [justification, setJustification] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewerRole, setReviewerRole] = useState("compliance_officer");
  const [overrideDecision, setOverrideDecision] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewerEmail);
  const canSubmit =
    justification.length >= 10 &&
    reviewerId.trim().length > 0 &&
    emailValid &&
    reviewerRole.trim().length > 0 &&
    (action !== "override" || overrideDecision.trim().length > 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      await submitReview({
        eventId,
        action,
        justification,
        reviewerId: reviewerId.trim(),
        reviewerEmail: reviewerEmail.trim(),
        reviewerRole: reviewerRole.trim(),
        overrideDecision: action === "override" ? overrideDecision.trim() : undefined,
      });
      setSuccess(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="dashboard-card dashboard-success-card">
        <p className="dashboard-success-title">Review submitted successfully.</p>
        <p className="dashboard-card-copy">
          This decision is now permanently recorded in the immutable audit trail for Article 14 oversight evidence.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="dashboard-card dashboard-form-card">
      <SectionLabel>Human review</SectionLabel>
      <div style={{ ...HEADING, fontSize: "clamp(26px, 3vw, 34px)", marginBottom: 10 }}>Operator approval flow.</div>
      <p style={{ ...BODY, fontSize: 15, marginBottom: 24 }}>
        Resolve this flagged verification event with a human decision, justification, and reviewer identity.
      </p>

      <div style={{ marginBottom: 20 }}>
        <p className="dashboard-field-label">Decision</p>
        <div className="dashboard-radio-row">
          {(["approve", "reject", "override"] as const).map((option) => (
            <label key={option} className={`dashboard-radio-card${action === option ? " active" : ""}`}>
              <input type="radio" name="action" value={option} checked={action === option} onChange={() => setAction(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      {action === "override" ? (
        <div style={{ marginBottom: 16 }}>
          <label className="dashboard-field-label">Override Decision</label>
          <input
            type="text"
            value={overrideDecision}
            onChange={(e) => setOverrideDecision(e.target.value)}
            placeholder="approved_with_conditions"
            className="dashboard-input"
          />
        </div>
      ) : null}

      <div style={{ marginBottom: 16 }}>
        <label className="dashboard-field-label">
          Justification <span className="dashboard-card-copy">({justification.length}/10 min)</span>
        </label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={4}
          placeholder="Provide the reasoning behind the human review decision..."
          className="dashboard-textarea"
        />
      </div>

      <div className="dashboard-form-grid">
        <div>
          <label className="dashboard-field-label">Reviewer ID</label>
          <input
            type="text"
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            placeholder="reviewer-id"
            className="dashboard-input"
          />
        </div>
        <div>
          <label className="dashboard-field-label">Email</label>
          <input
            type="email"
            value={reviewerEmail}
            onChange={(e) => setReviewerEmail(e.target.value)}
            placeholder="reviewer@example.com"
            className="dashboard-input"
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="dashboard-field-label">Role</label>
        <select value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value)} className="dashboard-select">
          <option value="compliance_officer">Compliance Officer</option>
          <option value="risk_manager">Risk Manager</option>
          <option value="auditor">Auditor</option>
          <option value="legal">Legal</option>
          <option value="cto">CTO</option>
        </select>
      </div>

      {error ? <p className="dashboard-error-copy">{error}</p> : null}

      <div className="dashboard-actions">
        <button type="submit" disabled={!canSubmit || submitting} className="btn-black dashboard-button-reset">
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </form>
  );
}
