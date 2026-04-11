"""Resource classes mirroring the TypeScript SDK surface."""

from __future__ import annotations
import time
from .errors import ClearAgentError
from .http import HttpClient


class AgentsResource:
    def __init__(self, http: HttpClient):
        self._http = http

    def register(self, *, name: str, external_id: str, model_provider: str | None = None,
                 model_id: str | None = None, description: str | None = None) -> dict:
        """Register a new AI agent under compliance oversight."""
        body = {"name": name, "externalId": external_id}
        if model_provider:
            body["modelProvider"] = model_provider
        if model_id:
            body["modelId"] = model_id
        if description:
            body["description"] = description
        return self._http.post("/v1/agents/register", json=body)

    def suspend(self, agent_id: str) -> dict:
        """Suspend an agent (EU AI Act Art. 14 stop button)."""
        return self._http.post(f"/v1/agents/{agent_id}/status", json={"status": "suspended"})

    def activate(self, agent_id: str) -> dict:
        """Re-activate a suspended agent."""
        return self._http.post(f"/v1/agents/{agent_id}/status", json={"status": "active"})

    def flag(self, agent_id: str) -> dict:
        """Flag an agent for investigation."""
        return self._http.post(f"/v1/agents/{agent_id}/status", json={"status": "flagged"})

    def list(self, limit: int = 50, cursor: str | None = None) -> dict:
        """List registered agents with cursor pagination."""
        params: dict = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        return self._http.get("/v1/agents", params=params)


class EventsResource:
    def __init__(self, http: HttpClient):
        self._http = http

    def verify(self, *, input: dict, event_type: str = "settlement_signal",
               event_category: str = "transaction", session_id: str | None = None,
               parent_event_id: str | None = None, sequence_num: int = 0) -> dict:
        """Submit an event for async verification (EU AI Act Art. 12).

        Returns:
            dict with ``jobId`` — poll with ``jobs.poll(job_id)``
        """
        body: dict = {
            "input": input,
            "eventType": event_type,
            "eventCategory": event_category,
            "sequenceNum": sequence_num,
        }
        if session_id:
            body["sessionId"] = session_id
        if parent_event_id:
            body["parentEventId"] = parent_event_id
        return self._http.post("/v1/events/verify", json=body)

    def get(self, event_id: str) -> dict:
        """Fetch a single verification event with linked human reviews."""
        return self._http.get(f"/v1/events/{event_id}")

    def list(self, limit: int = 50, cursor: str | None = None,
             status: str | None = None, agent_id: str | None = None) -> dict:
        """List events with optional cursor pagination and filters."""
        params: dict = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        if status:
            params["status"] = status
        if agent_id:
            params["agent_id"] = agent_id
        return self._http.get("/v1/events", params=params)


class JobsResource:
    def __init__(self, http: HttpClient):
        self._http = http

    def get(self, job_id: str) -> dict:
        """Fetch a single job by ID."""
        return self._http.get(f"/v1/jobs/{job_id}")

    def poll(self, job_id: str, max_attempts: int = 30, interval_ms: int = 500) -> dict:
        """Poll a job until it completes or fails.

        Returns:
            Completed job dict with ``eventId``, ``contentHash``, ``requiresReview``.

        Raises:
            ClearAgentError: if the job fails or max_attempts is exceeded.
        """
        for _ in range(max_attempts):
            job = self.get(job_id)
            if job["status"] == "completed":
                return job
            if job["status"] == "failed":
                raise ClearAgentError(
                    f"Verification job {job_id} failed: {job.get('error', 'unknown error')}",
                    code="job_failed",
                )
            time.sleep(interval_ms / 1000)
        raise ClearAgentError(
            f"Job {job_id} did not complete within {max_attempts} attempts",
            code="poll_timeout",
        )


class ReviewsResource:
    def __init__(self, http: HttpClient):
        self._http = http

    def submit(self, *, event_id: str, action: str, justification: str,
               reviewer_id: str, reviewer_email: str, reviewer_role: str,
               override_decision: str | None = None) -> dict:
        """Submit a human review decision (EU AI Act Art. 14).

        Args:
            action: ``"approve"``, ``"reject"``, or ``"override"``
            justification: Mandatory reasoning (≥10 chars per Art. 14)
        """
        body: dict = {
            "eventId": event_id,
            "action": action,
            "justification": justification,
            "reviewerId": reviewer_id,
            "reviewerEmail": reviewer_email,
            "reviewerRole": reviewer_role,
        }
        if override_decision:
            body["overrideDecision"] = override_decision
        return self._http.post("/v1/reviews", json=body)


class AuditResource:
    def __init__(self, http: HttpClient):
        self._http = http

    def integrity(self) -> dict:
        """Verify hash chain integrity (EU AI Act Art. 12 + 19).

        Returns:
            dict with ``validChain``, ``totalEvents``, ``merkleRoot``, ``checkedAt``.
        """
        return self._http.get("/v1/audit/integrity")

    def export(self, *, format: str = "json", agent_id: str | None = None,
               status: str | None = None, from_date: str | None = None,
               to_date: str | None = None, authority_name: str | None = None,
               authority_ref: str | None = None) -> dict:
        """Export compliance records (EU AI Act Art. 19).

        Args:
            format: ``"json"`` (default) or ``"xml"``
        """
        params: dict = {"format": format}
        if agent_id:
            params["agent_id"] = agent_id
        if status:
            params["status"] = status
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        if authority_name:
            params["authority_name"] = authority_name
        if authority_ref:
            params["authority_ref"] = authority_ref
        return self._http.get("/v1/audit/export", params=params)
