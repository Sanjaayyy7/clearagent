"""
ClearAgent Python SDK (alpha)

EU AI Act compliance infrastructure — Art. 12, 14, 19

Usage:
    from clearagent import ClearAgentClient

    ca = ClearAgentClient(api_key="ca_live_...")

    # Submit and poll
    job = ca.events.verify(input={"amount": 1500, "currency": "EUR"})
    result = ca.jobs.poll(job["jobId"])

    # Audit integrity
    integrity = ca.audit.integrity()
"""

from .client import ClearAgentClient
from .errors import ClearAgentError

__all__ = ["ClearAgentClient", "ClearAgentError"]
__version__ = "0.1.0a1"
