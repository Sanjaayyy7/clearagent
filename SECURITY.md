# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅ Current |
| 0.1.x   | ⚠️ Security fixes only |
| < 0.1   | ❌ Not supported |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **security@clearagent.io**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any proof-of-concept code (kept confidential)

**Response timeline:**
- Acknowledgment within 48 hours
- Initial assessment within 5 business days
- Status updates at least every 7 days until resolved

## Responsible Disclosure

We ask that you:
- Give us reasonable time to investigate and patch before public disclosure
- Avoid accessing or modifying data that is not yours
- Do not perform actions that could impact service availability

In return, we will:
- Acknowledge your report promptly
- Keep you informed of progress
- Credit you in the release notes (unless you prefer anonymity)
- Not pursue legal action for good-faith security research

## Scope

### Critical (respond within 24 hours)

- **Hash chain integrity bypass** — Any mechanism that allows `verification_events` records to be modified or deleted, or allows insertion with a forged `prevHash`, is a critical vulnerability. This directly undermines EU AI Act compliance guarantees.
- **API authentication bypass** — Accessing protected endpoints without a valid API key
- **Data exfiltration** — Unauthorized access to audit records, human reviews, or organization data
- **SQL injection** — Any vector that allows arbitrary database queries

### High

- **Privilege escalation** — Accessing another organization's audit data
- **Immutability trigger bypass** — Techniques that allow circumventing the PostgreSQL immutability trigger via raw connections or migrations
- **Audit export tampering** — Modifying export files after the SHA-256 hash is recorded

### Medium

- **Denial of service** — Sustained attacks that make the verification API unavailable
- **Information disclosure** — Error messages that leak internal structure or credentials

### Out of Scope

- Vulnerabilities in development-only configurations (e.g., the demo API key in `.env.example`)
- UI/cosmetic issues in the dashboard
- Issues in third-party dependencies (report those upstream)
- Theoretical vulnerabilities without a practical attack path
- Rate limiting on the demo environment
