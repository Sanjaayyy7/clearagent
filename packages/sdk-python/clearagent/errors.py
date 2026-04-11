class ClearAgentError(Exception):
    """Raised when the ClearAgent API returns an error response."""

    def __init__(self, message: str, status: int | None = None, code: str | None = None):
        super().__init__(message)
        self.status = status
        self.code = code

    def __repr__(self) -> str:
        return f"ClearAgentError(status={self.status}, code={self.code!r}, message={str(self)!r})"
