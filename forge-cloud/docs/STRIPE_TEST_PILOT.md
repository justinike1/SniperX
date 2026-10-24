# Forge v1.1 — Test Checkout Pilot Only

**This is a technical test integration, not a launch authorization.** No real financial balances, bank payouts, W-2 wages, connected-account transfers, or payment guarantees are created here.

## Product behavior

- Existing private-beta mission posting, admin approval, assignment, proof, buyer acceptance, Earn Today, and simulated wallet remain in place.
- The added Stripe **test-mode** Checkout endpoint lets an authenticated **buyer** open a Stripe-hosted test checkout for their own eligible mission.
- A signed test-mode Stripe webhook records whether the test Checkout Session is paid, expired, or ineligible. Every event is stored with a unique ID.
- Stripe test payments are kept **entirely separate** from the sandbox worker wallet. **No test Checkout event ever credits earnings, collects real funds or transfers money.**
- Worker wallet simulated standard/instant payout fees remain mock calculations only and are not provider quotes.
- An admin can inspect read-only ledger integrity and unresolved launch blockers.

## Configuration

Only use your own Stripe **test-mode** credentials. Do not put credentials in Git, Cursor prompts, screenshots, or ChatGPT. Configure them privately in a secrets manager or a local process environment:

```
FORGE_STRIPE_TEST_SECRET_KEY=sk_test_<your test-mode secret>
FORGE_STRIPE_TEST_WEBHOOK_SECRET=whsec_<your test-mode webhook signing secret>
FORGE_PUBLIC_ORIGIN=http://127.0.0.1:5200
```

Never configure `sk_live_` values: startup rejects them. Never convert this into live mode by changing the key prefix; real payments require a separately designed and reviewed integration.

To use Stripe CLI, connect the forwarding endpoint for the local service to `http://127.0.0.1:5200/api/webhooks/stripe-test`; use the CLI-provided **test** webhook signing secret. Stripe CLI and network access are not needed to run the included offline tests.

## API

| Method | Path | Who | Function |
|---|---|---|---|
| POST | `/api/missions/:id/test-checkout` | Mission's buyer | Create or return a hosted TEST Checkout Session; requires same-site CSRF token. |
| GET | `/api/missions/:id/test-checkout/status` | Mission's buyer or admin | Review test-only session state. |
| POST | `/api/webhooks/stripe-test` | Stripe test-mode webhook | Raw-body HMAC signature required; no user session/CSRF; never accepts `livemode:true`. |
| GET | `/api/admin/stripe-test/summary` | Admin | View test integration status and event counts without secrets. |
| GET | `/api/admin/launch-audit` | Admin | Read-only ledger integrity checks and outstanding launch blockers. |

To exercise test checkout: create a buyer test mission, sign in as its buyer, call `POST /api/missions/{id}/test-checkout` with the existing `X-Forge-CSRF` mechanism, open the returned Stripe test URL, and check the signed webhook result with the status endpoint.

A successful checkout is marked `PAID_TEST` only when a signed Stripe event matches the expected mission ID, session ID, amount and currency, with `livemode:false` and `payment_status:paid`. No genuine card charge is issued.

## Operator audit

```
cd forge-cloud
npm run check
npm test
FORGE_DB_PATH=./data/forge.sqlite npm run audit:release
```

The audit command refuses to create a missing database. It exits nonzero if it finds financial inconsistencies. A clean **simulated** ledger is necessary for further testing, but is **not** a statement that live funds have settled or that production is ready.

## Launch blockers

1. Configure a real legal entity and contracts suitable for the marketplace.
2. Complete state-by-state worker classification assessment; in New Jersey, the ABC test applies, and W-2 employment shifts require an employer/payroll arrangement.
3. Independently verify buyer businesses, participant identities, service qualifications, and regulated work scopes; consent/background-check procedures where required.
4. Select the correct Stripe Connect account type, payment flow, and onboarding; review allowed business model and platform risk with Stripe.
5. Develop and independently audit a **separate** production ledger tied to actual processor charges, refunds, disputes, Stripe account balances, transfer IDs, worker entitlements, and bank payouts. Never rely on test-Checkout events as available production funds.
6. Confirm fast-payout eligibility and fee disclosure with the actual provider for each worker and destination. Faster payouts are not guaranteed, even in supported jurisdictions.
7. Implement human dispute handling, refunds, chargebacks, worker support, immutable audit retention and reconciliation.
8. Independent application penetration test, managed database/backup strategy, secrets handling, observability, abuse monitoring, and incident response.
9. Validate verified paying buyer demand in a tightly controlled legal pilot before public availability.

**No single configuration switch can approve or enable public launch or real worker payouts.**
