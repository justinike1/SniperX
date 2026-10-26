# IKE Automotive Group Website + Operations App (Durable Demo Build)

This directory contains a **server-backed implementation** for IKE Automotive Group.
Unlike the browser-only prototype, this build persists records to a durable JSON datastore on disk and enforces role-aware API access.

## Scope in this build

- Public brand website sections:
  - Home
  - The IKE Standard
  - Services
  - About Us
  - Questions
  - Begin Your Search
  - Private client access
- Two-step inquiry flow with durable save confirmation
- Connected case workflow records:
  - inquiry -> assignment -> vehicle brief -> scope -> sourcing -> offer review -> management review -> decision -> delivery -> reconciliation -> aftercare
- Staff roles (owner / manager / broker) with server-side checks
- Offer versioning and approval flow
- Client-private progress links with token hash storage, expiry, revocation, and renewal
- Activity history for major operational events
- Financial event ledger with idempotency key support
- Fictional lease comparison example and scheduled-cost math

## Important boundaries

- No live payments, payouts, credit submissions, dealer outreach, or customer campaigns
- No external integrations are treated as connected unless explicitly configured
- This implementation does not claim regulatory authorization or operating approval

## Run locally

From repository root:

```bash
node ike-automotive-brokerage-demo/website/server.mjs
```

Default URL:

- `http://127.0.0.1:4290`

## Environment variables (names only; no secrets)

- `IKE_WEBSITE_PORT` (default `4290`)
- `IKE_WEBSITE_DATA_PATH` (default `ike-automotive-brokerage-demo/website/data/store.json`)
- `IKE_WEBSITE_PUBLIC_URL` (used for generated progress links)
- `IKE_WEBSITE_SESSION_TTL_MINUTES`
- `IKE_WEBSITE_PROGRESS_LINK_TTL_HOURS`
- `IKE_OWNER_EMAIL`
- `IKE_OWNER_PASSWORD`
- `IKE_MANAGER_EMAIL`
- `IKE_MANAGER_PASSWORD`
- `IKE_BROKER_EMAIL`
- `IKE_BROKER_PASSWORD`

## Demo credentials (if env vars are not set)

- Owner: `owner@ike.demo` / `owner-demo-pass`
- Manager: `manager@ike.demo` / `manager-demo-pass`
- Broker: `broker@ike.demo` / `broker-demo-pass`

## Test

```bash
node --test ike-automotive-brokerage-demo/website/tests/*.test.mjs
```

## Migration / data evolution

- Datastore schema metadata is tracked by `schemaVersion` in the persisted store.
- Migration notes are append-only under `website/migrations/`.
- Existing applied migrations must not be rewritten; add new migration documents for schema evolution.

## Current implementation status

Implemented now:

- Durable intake and case creation
- Private client progress links with hash-only token storage
- Role enforcement for major case APIs
- Broker assignment and case-stage updates
- Offer draft -> approval -> publish flow with revision versions
- Client and staff decision recording
- Delivery checklist and financial ledger event recording
- Server-side case search + pagination
- Tasks with overdue/today/upcoming/calendar views (America/New_York business date interpretation)

Still open / owner decisions required:

- Final production authentication provider for hosted deployment
- Confirmed public business contact details (phone/email/hours/service area/domain)
- Final approved prices and terms for service publication
- Final cancellation/refund policy and broker compensation policy
- Regulatory/operating-authority final determinations
- External integration adapters (payments, CRM, dealer communications)

## Relationship to the original `/workspace` prototype

- `ike-automotive-brokerage-demo/` (root in this folder) remains a local browser-only planning/demo workspace.
- `ike-automotive-brokerage-demo/website/` is the durable server-backed operating app slice.
- They are intentionally separated to avoid mixing local-only simulation with durable records.
