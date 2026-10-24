> **v0.6 addendum (October 24, 2026):** Private-beta Verification Center is now integrated with persisted case tracking and audited admin workflows. This is **not** identity verification, professional license validation, legal background-screening consent, or permission to dispatch regulated work. See `docs/VERIFICATION_WORKFLOWS.md`. All real-world launch gates remain blocked.

# SniperX Forge — v0.8 Earn-First Private Beta

**Status: running prototype for PRIVATE, INVITE-ONLY evaluation. Not approved for real jobs assigned by Forge, payments, worker dispatch, or public launch.**

An expanding private-beta web app with protected buyer, worker and admin accounts, mission management, a persistent SQLite store, simulated assignment and earnings records, incident holds, audit events, and external employment listings fetched from documented sources when configured.

This `forge-cloud/` application runs independently of the original trading bot and the older `forge/` local demonstration. Both are preserved in the consolidated package. It does not require `OPENAI_API_KEY` or additional paid API access for its simulated workflows.


## What v0.8 adds

- **Earn-first service catalog:** eight safe, digital-only service templates in `src/marketplace.mjs`; all are DEMO ONLY, not live paid opportunities.
- **Universal occupation taxonomy:** 25 broad industry groups and many example occupations including aviation, healthcare, law, transportation, academics and trades. This does NOT mean Forge offers jobs or regulated services in every field.
- **Usable work exploration:** profession name search (including example roles), industry filter, role-specific navigation and responsive digital-service cards.
- **Guided buyer templates:** a buyer can select a service, read a suggested statement of work, and prefill the existing three-step simulated request form.
- **Authenticated read-only catalog APIs:** `GET /api/catalog` and `GET /api/services`, with access tests and no ability to grant licensure or payout eligibility.
- **No false scarcity or earnings claims:** zero paid mission inventory is represented as zero; demo templates never show fabricated prices or claimed payouts.
- **Testing:** Node integration tests for API authorization, template scope, safety and eligibility; browser smoke tests for desktop and mobile.

Launch strategy: begin with a handful of buyer-verified, low-risk digital services, prove that a paying customer is willing to buy and that an eligible participant can safely deliver it, then expand selectively.

## Check and start

Requires **Node.js 22.16+** (for built-in `node:sqlite`). SQLite in this Node release emits an experimental warning; this is an explicitly single-instance private beta, **not a million-user production database architecture**.

```bash
cd forge-cloud
npm run check
npm test
# Set a strong one-time admin password in your terminal (not in a committed file):
FORGE_ADMIN_EMAIL=owner@example.com FORGE_ADMIN_PASSWORD='CHANGE-TO-A-LONG-UNIQUE-PASSWORD' npm run admin:create
npm start
```

Then visit http://127.0.0.1:5200 . No `npm install` necessary: the application uses Node built-in modules and browser JavaScript.

An administrator can sign in, invite buyers/workers by email (invitation tokens are displayed once and must be delivered securely), review worker profiles as **demo** reviews, inspect mission requests, and manage simulated work and incident reports.

### Accounts and actions

- **Admin**: invitations; overview and audit; simulated worker review; approve and assign simulated missions; refresh approved real-job feeds.
- **Buyer**: create service requests; view only their missions; accept simulated deliverables; report issues.
- **Worker**: create a self-attested profile; view only assigned missions; submit simulated deliverables; report issues.

The application does not send invitations by email itself. No buyer, worker, license or background verification is performed. A manual demo review must NEVER be represented as real identity validation.

### Jobs: real sources, never synthetic claims

Configured operator-supplied Greenhouse public board tokens and/or USAJOBS credentials can fetch **external** employment advertisements. Listings have original publisher URLs and last-retrieved timestamps and expire from the UI if not refreshed within three days or past an official closure date. This does **not** establish that the employer, listing, compensation, or eligibility has been independently verified. Applicants must follow the real publisher's application process.

- `FORGE_GREENHOUSE_BOARDS`: comma-separated public Greenhouse board tokens explicitly approved by the operator for listing in Forge.
- `USAJOBS_API_KEY`: key obtained from the official USAJOBS developer program.
- `USAJOBS_USER_AGENT`: the email associated with the official USAJOBS key.

Official API docs: https://docs.greenhouse.io/job-board and https://developer.usajobs.gov/guides/authentication . Review terms before launch. The admin must click “Refresh approved source feeds”; background synchronization is not yet implemented. When no sources are configured, the job feed is **empty**.

### API summary

| Route | Who | Function |
|---|---|---|
| `GET /api/health` | Anyone with access to private host | Health/status, explicitly no payments or dispatch |
| `GET /api/session` | Everyone | Current session and CSRF token |
| `POST /api/auth/register` | Invite holder | Register from admin-provided invitation |
| `POST /api/auth/login` / `logout` | Everyone / signed-in | Session management |
| `POST /api/admin/invitations` | Admin | Invite limited buyer/worker role |
| `GET /api/admin/overview` / `audit` | Admin | Private operational metrics and audit events |
| `GET /api/admin/release-gates` | Admin | External launch gates all remain incomplete |
| `GET /api/catalog` | Signed-in | Industry and profession exploration; no live job claims |
| `GET /api/services` | Signed-in | Digital-service templates; no real booking or earnings |
| `GET /api/jobs` | Signed-in | External source-listed job feed |
| `POST /api/admin/jobs/refresh` | Admin | Fetch configured official-source job feeds |
| `GET/POST /api/workers/me` | Worker | View/create own profile |
| `POST /api/admin/workers/:id/review` | Admin | Mark DEMO worker profile reviewed (not verified) |
| `GET/POST /api/missions` | Signed-in / buyer | Scoped list or buyer creates a request |
| `GET /api/missions/:id` | Owner/assignee/admin | Scoped mission detail |
| `POST /api/missions/:id/approve` | Admin | Simulated human review |
| `GET /api/missions/:id/matches` | Admin | Explainable eligibility matches |
| `POST /api/missions/:id/assign` | Admin | Simulated worker assignment |
| `POST /api/missions/:id/submit` | Assigned worker | Simulated completion proof |
| `POST /api/missions/:id/accept` | Buyer-owner | Simulated customer acceptance |
| `POST /api/missions/:id/incident` | Authorized mission participants | Safety hold and audit event |

Authenticated POST endpoints require a CSRF token (`X-Forge-CSRF`). HTTP-only, SameSite=Strict session cookies are used. Cookies are marked Secure on HTTPS-origin deployments.

## Private cloud operation

See `docs/PRIVATE_DEPLOYMENT.md` and `docs/RELEASE_GATES.md` **before** binding the server beyond localhost. For private testing, use a secured server, TLS reverse proxy, additional access-control gateway, limited invited accounts, persistent backups, monitoring and incident owners. **Do not enable public signups or real commerce.**

`FORGE_DB_PATH` defaults to `./data/forge.sqlite`. Ensure the directory is on persistent storage, backed up, access-controlled and not checked into git.

### Known limitations

- SQLite is single-instance and experimental in the pinned Node version. PostgreSQL, migration tooling, durable queues, outbox patterns and horizontal scale are future work.
- In-process rate limiting is useful for a private pilot but must be replaced or complemented with edge-level distributed controls for larger deployments.
- No independent penetration test, administrator MFA, managed IAM, automated email delivery, licensing/background provider integration, payment integration, or real-world safety operation.
- No true production-ready workforce classification policy, dispute adjudication, fund custody or evidence retention rules.
- No real money moves. Metrics from completed assignments are explicitly simulated.
- Live job feeds are source-retrieved, **not** independently validated by employers; API access and terms may change.

## Security and privacy

See `docs/SECURITY_ARCHITECTURE.md`, `docs/RELEASE_GATES.md`, and `docs/CURSOR_FINAL_REVIEW.md`. The software is deliberately **fail-closed for real work and payments**. The code and tests establish a useful foundation, but cannot eliminate the risk of fraud, litigation, injuries, abuse or data loss.

## v0.7 User experience update

The v0.7 release makes the **existing private beta** easier to navigate without expanding its legal or operational scope. It adds role-specific Home actions, a guided three-step customer service request, job and project search/filter controls, mobile-friendly navigation, plain-language verification/help pages, and accessible action dialogs instead of browser prompts.

Read `docs/UX_V07.md` for exact changes, tests, and limitations. Run `npm test && npm run check` to validate the current application. A separate Playwright mock-API browser smoke test lives at `tools/ui-smoke.playwright.py` (requires Python Playwright and an installed Chromium browser).

**Do not interpret a more polished user interface as evidence that real payments, live customer work, license verification, or background screening have been activated.**


## v0.7 user experience (tested October 24, 2026)

The responsive UI now presents plain-language, role-aware navigation and starter actions for customers, participants, and admins. It includes an accessible three-step request wizard with field validation, review screen and accurate progress indicator; searchable job listings and projects; responsive mobile navigation and tap targets; explanations of the private-beta status; and native accessible confirmation dialogs for consequential operations.

**Validation:** The backend Node.js test suite passes 19 tests. Syntax checks pass. Chromium Playwright checks against isolated mock API responses cover buyer, worker, admin, job search, the request wizard, responsive layout, and JavaScript runtime errors. These **mocked browser checks do not** validate live source ingestion, real financial transactions, identity providers, third-party screening, or full end-to-end cloud hosting.

**Known limits:** Invite-only beta; SQLite persistence; test-only missions and financial figures; no real identity, business, license, or background verification; external listings require authorized feeds; no public launch authorization.
