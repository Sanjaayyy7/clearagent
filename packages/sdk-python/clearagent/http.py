"""Thin HTTP client wrapper around httpx."""

from __future__ import annotations
import httpx
from .errors import ClearAgentError


class HttpClient:
    def __init__(self, api_key: str, base_url: str, timeout: float = 30.0):
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "clearagent-python/0.1.0a1",
            },
            timeout=timeout,
        )

    def get(self, path: str, params: dict | None = None) -> dict:
        resp = self._client.get(path, params=params)
        return self._handle(resp)

    def post(self, path: str, json: dict | None = None) -> dict:
        resp = self._client.post(path, json=json)
        return self._handle(resp)

    def _handle(self, resp: httpx.Response) -> dict:
        if not resp.is_success:
            try:
                body = resp.json()
                err = body.get("error", {})
                raise ClearAgentError(
                    err.get("message", resp.text),
                    status=resp.status_code,
                    code=err.get("code"),
                )
            except (ValueError, KeyError):
                raise ClearAgentError(resp.text, status=resp.status_code)
        return resp.json()

    def close(self) -> None:
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
