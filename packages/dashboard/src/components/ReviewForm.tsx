import { useState } from "react";
import { submitReview } from "../lib/api.ts";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-sm">
        Review submitted successfully. This decision is permanently recorded in the immutable audit trail (EU AI Act Art. 14).
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-brand-text">Human Review Required (Art. 14)</h3>

      {/* Action */}
      <div>
        <p className="text-xs text-brand-muted mb-2 uppercase tracking-wide">Decision</p>
        <div className="flex gap-3">
          {(["approve", "reject", "override"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="action"
                value={opt}
                checked={action === opt}
                onChange={() => setAction(opt)}
                className="accent-brand-accent"
              />
              <span className="text-sm capitalize">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Override decision (conditional) */}
      {action === "override" && (
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">
            Override Decision
          </label>
          <input
            type="text"
            value={overrideDecision}
            onChange={(e) => setOverrideDecision(e.target.value)}
            placeholder="e.g. approved_with_conditions"
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
      )}

      {/* Justification */}
      <div>
        <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">
          Justification <span className="text-brand-muted normal-case">({justification.length}/10 min)</span>
        </label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={3}
          placeholder="Provide justification for this review decision..."
          className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent resize-none"
        />
      </div>

      {/* Reviewer fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">Reviewer ID</label>
          <input
            type="text"
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            placeholder="reviewer-id"
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">Email</label>
          <input
            type="email"
            value={reviewerEmail}
            onChange={(e) => setReviewerEmail(e.target.value)}
            placeholder="reviewer@example.com"
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">Role</label>
        <select
          value={reviewerRole}
          onChange={(e) => setReviewerRole(e.target.value)}
          className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
        >
          <option value="compliance_officer">Compliance Officer</option>
          <option value="risk_manager">Risk Manager</option>
          <option value="auditor">Auditor</option>
          <option value="legal">Legal</option>
          <option value="cto">CTO</option>
        </select>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full bg-brand-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
