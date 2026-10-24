# SniperX Forge — Prototype v0.3 (Trust & Safety Pass)

**A demand-backed work coordination platform.** This is a standalone, deliberately local-only **sandbox** developed as an additive companion to the existing `SniperX` cryptocurrency trading repository. It is *not* integrated into, deployed with, or a replacement for the original trading server.

Forge explores a single core loop: a buyer has a defined service request → a qualified participant is matched → a demo assignment progresses through acceptance → simulated money flows and demand gaps are tracked.

## Try it locally

Requires **Node.js 20+**. No additional packages or payment account needed.

```bash
cd forge
npm test
npm run check
npm start
```

Open **http://127.0.0.1:5100**. If your machine has an existing service on port 5100, set `FORGE_PORT=5200` before starting. The server intentionally refuses to bind to public network interfaces; don't deploy this demo as-is.

Your local changes are saved to `forge/.local/demo-state.json`, which is git-ignored. Use **Reset demo** to clear the fictional scenario.

## What you can do

- Open the **Overview** dashboard showing sandbox missions, workers and simulated completed payouts.
- Use **New Request** to create a fictional buyer-backed service request with budget, schedule, skills and acceptance requirements.
- Use **Mission Board** to approve scope, inspect transparently ranked candidate matches, assign a participant, submit proof notes, record fictional customer acceptance, or cancel.
- Use **Talent Network** to add a fictional participant, their minimum assignment pay and skills, and explicit remote-delivery permission.
- Use **Demand Intelligence** to see coverage by category, unfilled mission gaps, demand pipeline and potential vs completed *simulated* compensation.
- Reset the entire demo to fresh fictional examples.

## Prototype hardening (0.3)

- Unsafe-scope screening for selected hazard, deceptive-work, vulnerable-person and credentials scenarios. Keyword heuristics are incomplete and never sufficient to authorize real work.
- Explicit simulated operator scope-review attestation before approving a demo mission.
- Safety hold reporting blocks further progression, except cancellation; does not contact emergency services.
- Local-only Host validation, random per-run anti-CSRF token, origin checks, basic request throttling, request-size cap, secure browser response headers, and restricted local file permissions.
- Adult self-attestation for fictional participants, with **no independent identity or age verification**.
- Trust & Safety Center screen and public-launch blocked status.

See `docs/TRUST_AND_SAFETY.md` and `docs/RELEASE_GATES.md`. All production release gates currently FAIL.

**Security qualification:** This is not a production authentication architecture. Any person or program that can access the local browser session may operate the demo.

## API endpoints

| Method | Path | Result |
|---|---|---|
| GET | `/api/forge/health` | Sandbox status and public-launch block |
| GET | `/api/forge/safety` | Safety holds, real-operation gates and limitations |
| GET | `/api/forge` | Snapshot, missions, participants, activity |
| GET | `/api/forge/intelligence` | Demand supply coverage, gaps, simulated pipeline metrics |
| POST | `/api/forge/missions` | Validate and create demo mission |
| GET | `/api/forge/missions/:id/matches` | Transparent eligibility and ranking |
| GET | `/api/forge/missions/:id/analysis` | Readiness flags and worker-coverage assessment |
| POST | `/api/forge/missions/:id/transition` | Advance mission through finite-state workflow |
| POST | `/api/forge/workers` | Register fictional demo participant |
| POST | `/api/forge/missions/:id/incident` | Record a **demo** safety concern and permanently hold mission progression (until cancellation) |
| POST | `/api/forge/reset` | Reset demo records |

**API developer note:** For local POST requests, load `/` first, read the per-process `forge-csrf` meta token and pass it in `X-Forge-CSRF`; the UI does this automatically. This anti-CSRF token is not user authentication.

## Matching policy

Workers must have every required skill, compatible availability, adequate compensation, and verified location compatibility in the model. In-person jobs require a **same-city match** until travel coverage is checked. Different-city remote work is allowed only when the worker opted in *and* the task is in `Digital Setup` or `Content & Copy`. Do not treat this as real-world verification of availability, licensing, identity, travel, or capability.

The demo uses a fixed 28% platform fee, not a negotiated or actual fee. Displayed 'earnings' are **simulated**, not payouts, sales, escrow or bank transfers.

## Status transitions

```
NEW -> APPROVED -> ASSIGNED -> SUBMITTED -> COMPLETED
                  ^           |
                  +-----------+  (revision requested)
```

Cancellation is possible before completion. 'Completed' requires explicit fictional customer acceptance. State changes and data persist atomically in the local JSON file for demo use.

## Tests

`npm test` covers input validation, payout arithmetic, matching, geography and remote opt-in, transitions, approval, noninflated earnings, and demand intelligence. `npm run check` validates JS syntax. These tests **do not** constitute security testing or real commercial validation.

## What must happen before live customers

1. Design isolated multi-tenant authentication, role-based authorization, and consent-based personal data storage (not the existing trading schema).
2. Replace fictional listings with genuine customer-confirmed requests; verify buyers, participants, scope and qualifications.
3. Implement proper location and travel-distance checks rather than the initial conservative city rule.
4. Integrate a regulated payment processor with onboarding, taxes, refunds, customer disputes, fraud prevention, and auditable payment ledgers.
5. Review service category licenses, worker classification and insurance requirements by jurisdiction with appropriate advisers.
6. Move demo JSON storage to durable relational storage with migrations, audit logs, idempotent financial operations and access controls.
7. Establish a pilot with 5 verified paid assignments and positive contribution margin before scaling.

**Security note:** The prototype has no real accounts, authentication, or payment provider and intentionally operates only on localhost. Never expose it publicly without a security overhaul.

## Roadmap

- v0.2: functional, tested local prototype with honest simulated economics and demand intelligence.
- v0.3 (this package): explicit sandbox-only safety review, prohibited-scope filter, permanent safety holds, local HTTP hardening and release gates.
- v0.3: protected customer/participant accounts, PostgreSQL schema, service catalog and onboarding.
- v0.4: verified first-party requests, evidence upload and human-operated fulfillment workflow.
- v0.5: controlled production pilot with payments, disputes, trust controls, and financial reconciliation.
- v1.0: real-world metrics, repeat customers, automated mission assembly for one proven service category.

## Integrating with your original repository

Copy this **`forge/`** directory into the root of `justinike1/SniperX`, without overwriting any original files. It has its own `package.json` and local HTTP server on port 5100. Open that folder in Cursor and execute `npm test && npm start` from within it.

Keep the cryptocurrency system and Forge as separate processes and data stores until the consumer platform has a secure architecture and explicit migration plan. No trading or wallet-related files need to change.
