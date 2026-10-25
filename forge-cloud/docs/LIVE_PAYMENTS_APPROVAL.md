# LIVE PAYMENTS — DESIGN, APPROVAL & ACCEPTANCE CHECKLIST
**NOT APPROVED. NO LIVE PAYMENTS IMPLEMENTED.** Owners: founder, payment-integration engineer, Stripe, payments counsel, operations lead.

## What Stripe directly confirmed in connected TEST account, October 24, 2026
- Charges: disabled; payouts: disabled; submitted business details: false; account verification pending. An account available in TEST mode is not a LIVE account authorization.
- Forge `stripe_test.mjs` explicitly restricts test checkout to test keys and rejects live webhook events. Worker `payouts.mjs` uses a non-monetary SQLite sandbox ledger. Never rename this to `wallet` or show it as spendable money in a live market.

## Approval sequence — actions for company owner/provider
1. Decide and document the real legal entity, ownership, country, tax details, service category, support email, company website, refund policies, chargeback responsibilities, pricing, and real company bank account. Submit these **directly in Stripe Dashboard**, not through source code. Stripe may require identity/KYB proof.
2. Describe Forge accurately to Stripe as a two-sided marketplace for defined professional service projects, distinguishing employment placement from services. Ask Stripe to approve **Connect** and the actual services/locations, not merely ordinary card checkout. Ask for a written confirmation where possible.
3. Choose Connected Accounts + hosted onboarding for workers. Do not collect or store workers' full SSNs, banking passwords, bank numbers, license images, or identity documents in Forge unless separately approved and secured.
4. Evaluate **separate charges and transfers**: platform collects customer payment; records provider's claim; after completion/acceptance, risk and funds-availability checks, sends a Transfer to a verified eligible connected account. Transfers move money between Stripe accounts; a Payout moves connected-account funds to an external bank/debit destination. Neither is escrow.
5. Configure charge/refund/dispute/webhook/transfer/payout flows on test accounts and simulate refunds, duplicate webhook delivery, chargebacks and charge reversals.
6. Implement durable SQL financial tables: customer charges, provider accruals, provider transfers, connected-account balance status, bank payouts, refund/dispute liabilities, idempotency and immutable audit events. Keep Stripe API secrets in a managed secret store. Enforce one settlement decision per eligible mission via transactional outbox and event ledger.
7. Reconcile Stripe source-of-truth balances, fees, captures, transfers and payouts to the internal ledger at least daily. Alert on any mismatch; automatically hold payouts until investigated. For chargebacks after payout, document reserve/negative-balance responsibility and collection policy with counsel.
8. Publish accurate fees and timing, establish dedicated liquidity/cash reserve, worker help and refund procedures. Support **standard payout** as the default; show faster payout option only after verifying provider eligibility and net proceeds. Never imply a standard transfer is necessarily same-day.
9. Enable LIVE mode only after written approval, security clearance, successful controlled live test transactions, founder sign-off and documented emergency rollback.

## Minimal state model — use separate states, NEVER collapse to 'paid'
- Mission: `POSTED_REVIEW` → `APPROVED` → `ASSIGNED` → `SUBMITTED` → `ACCEPTED` / `DISPUTED` / `CANCELLED`.
- Customer payment: `CHECKOUT_OPEN` → `AUTHORIZED_OR_PENDING` → `CHARGE_SUCCEEDED` / `FAILED` / `REFUNDED` / `DISPUTED`.
- Earnings: `NOT_EARNED` → `EARNED_PENDING_SETTLEMENT` → `TRANSFER_ELIGIBLE` → `TRANSFER_REQUESTED` → `TRANSFER_CONFIRMED` / `TRANSFER_FAILED`.
- Provider withdrawal: `NOT_ELIGIBLE` → `AVAILABLE_TO_PAYOUT` → `PAYOUT_REQUESTED` → `PAID_TO_DESTINATION` / `PAYOUT_FAILED` / `PAYOUT_REVERSED`.
- Customer payment captured ≠ money available to transfer ≠ transfer complete ≠ cash in bank.

## Hard blockers — acceptance criteria
- LIVE Stripe account **charges_enabled**, Connect transfer capability and worker account payout capability verified (not inferred from test credentials).
- Written decision on merchant-of-record, reserve, reversals, funds holding / money transmission / escrow presentation and refund liability.
- Unique charge IDs, event IDs, transfer IDs, bank payout IDs and idempotency keys; signed webhook validation, timestamp tolerance and durable deduplication.
- Payment amount and currency match the buyer-approved mission; every transfer linked to a collected eligible payment; concurrency tests forbid double transfer.
- Insufficient balance or suspended account -> stop and inform user accurately. Failed payout -> do not mark completed; investigate/retry with a new safely controlled idempotency policy.
- Platform expenses, refunds and reserves modeled separately from worker entitlements; no fictional wallet funds ever credited by a test webhook.
- User can see actual posted fees and estimated net amount before optional instant payout, without guaranteeing speed.
- Work that is W-2 or staffing-related NEVER routed through Connect contractor flows until separately reviewed and authorized; employer or licensed staffing payroll handles wages.

## Payout example (illustrative, NOT a provider quote)
Buyer pays $100, a hypothetical 15% marketplace fee applies. Before Stripe processing fees, reserves, taxes and other obligations, $85 is nominal provider allocation. A separate optional faster payout fee can apply only if lawful, disclosed and available to that connected account; do not treat this example as a promised price or timeline.

## Reference docs (official provider)
- https://docs.stripe.com/connect/marketplace
- https://docs.stripe.com/connect/marketplace/tasks/accept-payment/separate-charges-and-transfers
- https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes
- https://docs.stripe.com/connect/instant-payouts
- https://docs.stripe.com/connect/marketplace/tasks/payout
- https://docs.stripe.com/connect/design-an-integration
