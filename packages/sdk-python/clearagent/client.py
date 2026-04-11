"""ClearAgent Python SDK — main client."""

from __future__ import annotations
from .http import HttpClient
from .resources import AgentsResource, AuditResource, EventsResource, JobsResource, ReviewsResource


class ClearAgentClient:
    """Client for the ClearAgent API.

    Args:
        api_key:  Your ClearAgent API key (starts with ``ca_live_`` or ``ca_test_``).
        base_url: API base URL. Defaults to ``http://localhost:3000``.
        timeout:  Request timeout in seconds. Defaults to 30.

    Example::

        from clearagent import ClearAgentClient

        ca = ClearAgentClient(api_key="ca_live_...")

        # Submit a verification event (Art. 12)
        job = ca.events.verify(input={"amount": 1500, "currency": "EUR", "recipient": "DE89..."})
        result = ca.jobs.poll(job["jobId"])

        # Human review if flagged (Art. 14)
        if result.get("requiresReview"):
            ca.reviews.submit(
                event_id=result["eventId"],
                action="approve",
                justification="Verified by compliance team — supplier invoice confirmed",
                reviewer_id="alice@acme.com",
                reviewer_email="alice@acme.com",
                reviewer_role="compliance_officer",
            )

        # Audit integrity check (Art. 19)
        integrity = ca.audit.integrity()
        assert integrity["validChain"], "Hash chain broken!"
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:3000",
        timeout: float = 30.0,
    ):
        self._http = HttpClient(api_key=api_key, base_url=base_url, timeout=timeout)
        self.agents = AgentsResource(self._http)
        self.events = EventsResource(self._http)
        self.jobs = JobsResource(self._http)
        self.reviews = ReviewsResource(self._http)
        self.audit = AuditResource(self._http)

    def close(self) -> None:
        """Close the underlying HTTP connection pool."""
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
