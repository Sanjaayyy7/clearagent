## What does this PR do?

<!-- Describe the change clearly. Link to the issue it closes if applicable. Closes #... -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Compliance improvement
- [ ] Refactor (no behavior change)
- [ ] Breaking change

## Compliance checklist

> The immutability of `verification_events` and `human_reviews` is the core compliance guarantee. PRs that weaken it will not be merged.

- [ ] This PR does **NOT** add UPDATE or DELETE operations to `verification_events`
- [ ] This PR does **NOT** bypass or remove the `enforce_ve_immutability` PostgreSQL trigger
- [ ] This PR does **NOT** add UPDATE or DELETE operations to `human_reviews`
- [ ] Any new API endpoints are authenticated (or explicitly justified as public)
- [ ] Hash chain computation in `hashChain.ts` is not modified (or: changes include migration strategy + tests)

## Testing

How did you verify this change works? What scenarios did you test?

```bash
# Commands you ran to test
```

## Screenshots (if UI change)

<!-- Before / after screenshots for dashboard changes -->
