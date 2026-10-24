# One-time Cursor final review — use ONLY after core Forge development is finished

## Product

SniperX Forge is a safety-first economic coordination platform: authenticated accounts, customer-backed simulated assignments, admin review, worker profiles, explainable matching, external employment-source feeds, source provenance, audit events and incident holds. The Forge platform must remain separate from the original trading application.

## Files

- `forge/` — preserved v0.3 local simulation and original docs.
- `forge-cloud/` — v0.5 cloud-capable private-beta code, no external packages.
- `forge-cloud/src/server.mjs`, `handlers.mjs`, `core.mjs`, `security.mjs`, `db.mjs`, `jobs.mjs`, `admin.mjs`
- `forge-cloud/public/` responsive, authenticated browser interface.
- `forge-cloud/tests/` API authorization and external job source tests.

## Review request for Cursor (copy this as ONE final task)

> Open the complete SniperX project. Do not rebuild SniperX Forge. Inspect the existing `forge/` and `forge-cloud/` folders, preserve both and preserve original trading code. Run the existing Forge checks and tests. Review backend authorization, browser security (including CSP and CSRF), session lifecycle, SQLite persistence, mission state transitions, incident holds, malicious payload paths, concurrency, backup safety and the external Greenhouse/USAJOBS feed handling. Fix confirmed bugs only and add regression tests. Check all API and UI actions manually in a browser using synthetic accounts. Ensure no real money moves, no real workers are dispatched, and no fake verification or hiring claims are shown. Summarize every actual change and any unresolved launch blockers. Work on a separate branch and do not merge or deploy without explicit authorization. Avoid changing old SniperX trading files or any related sensitive material. Do not install paid services or claim external legal/security approvals.

## Next *real* engineering milestones

1. Replace Node experimental SQLite with PostgreSQL under managed cloud hosting, with reversible migrations and transaction isolation tests.
2. Add administrator MFA + secure email verification and invited user account recovery.
3. Secure identity-provider integration and legally reviewed background/licensing processes; no synthetic statuses shown as real.
4. Real customer acquisition, provider-approved payments in test mode, signed webhooks and reconciliation.
5. Professional penetration test, load tests, disaster recovery exercise, monitored private alpha, independent legal review.

## Integration note

No external credential is needed to run the prototype. The official-job adapters require approved source configuration. External verification/production provider approval remains a prerequisite, not an automatic code feature.
