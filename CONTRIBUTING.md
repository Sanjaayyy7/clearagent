# Contributing to ClearAgent

Thank you for your interest in contributing. ClearAgent is compliance infrastructure — correctness and auditability matter more than velocity.

## Before You Start

- Check [existing issues](https://github.com/clearagent/clearagent/issues) to avoid duplicating work
- For significant changes, open an issue first to discuss the approach
- Read the [EU AI Act compliance guide](docs/eu-ai-act-guide.md) to understand the regulatory context
- Security vulnerabilities go to security@clearagent.io — not public issues

## Development Setup

**Prerequisites:** Docker Desktop, Node.js 20+, npm 10+

```bash
# 1. Clone and install
git clone https://github.com/clearagent/clearagent
cd clearagent
npm install

# 2. Environment
cp .env.example .env

# 3. Start PostgreSQL + Redis
docker compose up -d

# 4. Run migrations
npm run db:migrate

# 5. Seed demo data (80 events, 10 human reviews)
npm run seed

# 6. Start API server (port 3000)
npm run dev

# 7. Start dashboard (port 5173) — separate terminal
npm run dev:dashboard
```

Verify everything works:
```bash
curl http://localhost:3000/v1/health
# → { "status": "ok", "timestamp": "..." }
```

## Project Structure

```
clearagent-mvp/
├── packages/
│   ├── api/                  # Express API + BullMQ worker
│   │   └── src/
│   │       ├── db/           # Drizzle schema, migrations, client
│   │       ├── routes/       # Express route handlers
│   │       ├── services/     # hashChain.ts, oversight.ts
│   │       ├── workers/      # verify.worker.ts (BullMQ)
│   │       ├── verification/ # Domain-specific verifiers
│   │       ├── middleware/   # auth.ts, validate.ts
│   │       └── sse/          # Server-Sent Events broadcaster
│   ├── dashboard/            # React + Vite frontend
│   ├── sdk/                  # TypeScript SDK (in development)
│   └── mcp-server/           # MCP server (planned)
├── docker-compose.yml
└── .env.example
```

## Adding a New Verification Domain

ClearAgent ships with a `transaction` verification domain. To add a new one (e.g., `identity`, `authorization`):

1. **Create the verifier** at `packages/api/src/verification/<domain>.ts`
   - Export a `verify<Domain>(input: unknown): VerificationResult` function
   - `VerificationResult` must return `{ decision, confidence, reasoning, riskIndicators }`

2. **Register the domain** in `packages/api/src/workers/verify.worker.ts`
   - Add a branch in `processVerification()` that routes to your verifier based on `eventCategory`

3. **Add Zod schema** for the new input shape in `packages/api/src/routes/events.ts`
   - Validation runs before the job is queued — invalid input returns 400 immediately

4. **Write tests** covering:
   - Valid inputs → `approved`
   - Boundary conditions → `flagged`
   - Invalid inputs → `rejected`

5. **Update the docs** in `docs/api-reference.md` with example payloads for the new domain

## Writing Tests

```bash
npm run test                    # All packages
npm run test --workspace=packages/api   # API only
```

Tests live in `packages/<name>/src/__tests__/` or alongside source files as `*.test.ts`.

For verification domain tests, cover:
- Each decision path (`approved`, `rejected`, `flagged`)
- Hash chain continuity (verify `prevHash` links correctly)
- Immutability enforcement (confirm UPDATE/DELETE throw/are blocked)

## Compliance Considerations

> **The immutability guarantee is the core of ClearAgent's value. It is non-negotiable.**

**These rules are enforced and PRs that violate them will not be merged:**

1. **No UPDATE on `verification_events`** — The PostgreSQL trigger raises an exception on any update attempt. Do not remove or weaken this trigger. Do not use raw SQL to bypass it. Do not use `db.$client` to circumvent Drizzle's query builder.

2. **No DELETE on `verification_events`** — The PostgreSQL rule silently discards delete attempts. This is intentional. Do not remove this rule.

3. **No UPDATE or DELETE on `human_reviews`** — Same principle. Reviews are a permanent record of human decisions.

4. **Hash chain integrity must be preserved** — Any change to how `contentHash` or `prevHash` is computed requires:
   - A clear explanation of why the algorithm is changing
   - A migration strategy for existing events
   - Tests proving the integrity endpoint still validates correctly

5. **`justification` field is mandatory on reviews** — EU AI Act Art. 14 requires documented reasoning for human oversight decisions. The minimum length (10 characters) is not a suggestion.

If you are unsure whether a change affects compliance guarantees, open an issue and ask before writing code.

## Pull Request Process

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes with tests
3. Ensure `npm run typecheck` and `npm run lint` pass
4. Fill out the PR template completely — especially the compliance checklist
5. PRs require at least one approving review before merge
6. Squash merge is preferred for feature branches

## Code of Conduct

Be direct and technical. Assume good intent. Focus feedback on code, not people. Compliance infrastructure serves real regulatory requirements — keep discussion grounded in what the EU AI Act actually requires.

If you experience or witness unacceptable behavior, report it to the maintainers.
