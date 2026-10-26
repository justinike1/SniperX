# FORGE PILOT OPERATING PROCEDURES — v0.1 (DRAFT, NO LIVE APPROVAL)
Owner: Forge operations manager. Before operating, add staff names, contact channels, hours and coverage. All steps are REQUIRED when relevant; if nobody is assigned, do not open that feature.

## A. Start-of-day control (each pilot business day)
- Confirm environment: production version/commit ID, TLS, DNS, secure secrets, MFA for every admin, verified support mailbox, uptime monitor and alerts.
- Check Stripe dashboard and internal alerts: charge/refund/transfer/payout reconciliation, reserves, disputes, negative balances, webhooks (delivery lag/failures), duplicate event records. Any unreconciled monetary discrepancy = immediate payout freeze and incident ticket.
- Confirm last successful encrypted offsite backup, last restore drill and no integrity failures; confirm database storage and memory headroom.
- Validate currently advertised missions: verified buyers, scopes, funding states, accurate pay/time/location, working contact and expiration. Expire stale listings; remove suspicious or dangerous ones.
- Ensure support agent staffing, fraud reviewer, payment authority, legal escalation, incident response owner; maintain approvals separation for payment release.

## B. Buyer verification and new mission
1. Buyer provides business identity and contact details through approved identity/KYB service; do not collect SSNs or store bank details in the Forge database. Reject inability to verify.
2. Buyer writes a specific scope: deliverables, required skills, date, location/remote, acceptance rubric, maximum revisions, pay, cancellation and dispute terms. Screen prohibited work and regulated licensing.
3. Show full checkout total and fee breakdown. Never promise an assignment until customer funds are successfully charged and provider eligibility confirmed.
4. Route flagged, unusually high-value, off-platform payment, credential-sharing, high-risk physical work, false-urgency or deceptive tasks to manual review. No automatic approval of unverified customers.
5. Mission becomes discoverable ONLY when buyer and service are authorized for pilot AND eligible charge is confirmed. Keep previously sourced job listings labeled 'apply externally', never 'paid Forge mission'.

## C. Worker onboarding and matching
1. 18+ gating, contact verification, appropriate Stripe Connect hosted onboarding, capability and transfer/payout eligibility checks; treat platform verification and provider verification separately.
2. Confirm qualification/licensing for each authorized service category; absence of evidence = cannot dispatch. Protect against discriminatory ranking, retaliation and unverifiable job promises.
3. Worker sees pay, requirements, task duration, location, travel/expense expectations, deadline, customer verification signal and cancellation/dispute process BEFORE accepting.
4. Worker can decline without penalty. The app records terms/version consent, mission assignment, safety checklist, scope and timestamp. No unilateral dangerous changes of scope.

## D. Completion, acceptance and payment
1. Worker submits only necessary evidence; avoid PII, passwords, confidential photos, minors or private-home images unless independently authorized.
2. Customer accepts/rejects with objective reason inside a published review window. If no response, apply ONLY counsel-approved policy; no invented auto-acceptance.
3. Dispute flags suspend transfer eligibility. Operations review documented evidence; separate adjudicator and payout approver when possible; log all decisions.
4. Before transfer: verify genuine charge success, no open dispute/fraud/safety hold/refund, connected account eligible, cleared/available funds and reconciled amount/currency; unique idempotency and transfer records.
5. Transfer to connected account and log Stripe transfer ID and event confirmation. Standard bank payout is a separate provider process; track initiated, confirmed, failed and returned states. Never mark 'deposited' until provider confirms.
6. Faster payout: optional only if available/eligible; show fee, net, destination and timing disclosure. Worker can select standard method. Never impose contractor fast-fee logic on W-2 wages.

## E. Refunds, missed work, chargebacks
- Buyer cancellation or worker nonperformance: freeze transfer, calculate refund under approved policy, record reason; issue refund only against confirmed Stripe charge, use idempotency, monitor succeeded/failed/partial status.
- Completed transfer + later refund/dispute: DO NOT silently deduct from unrelated worker balance; escalate under documented transfer reversal/negative-balance rules; reserve liquidity and communicate with affected users. Stripe fees and dispute losses may remain platform responsibility.
- Chargeback: open case immediately, collect receipt/deliverables/timeline/communications lawfully, respond to processor deadline, notify responsible operator and counsel on material cases. Maintain evidence retention timeline.

## F. Safety, scams, abuse and urgent user need
- Block upfront-pay-to-work schemes, off-platform money transfer requests, fake checks, gift-card purchases, bank login requests, impersonation, adult/illegal/hazardous tasks, exploitation and suspicious listings.
- Safety hold freezes mission and any unexecuted transfer, but never deletes evidence. Flag severe events for human review. For immediate threat to life/safety, direct user to local emergency services; Forge is not an emergency responder.
- Protect financially vulnerable users: plain-language fees, no urgency manipulation, accessible support; never suggest a mission guarantees bill coverage tomorrow.
- Operator must never promise a refund, charge reversal, bank arrival or legal result until verified.

## G. Support desk targets (pilot service objectives, not legal promises)
- Payment failure / unable to access accrued earnings: acknowledge within 1 business hour during support coverage, escalate to finance immediately.
- Safety complaint: triage as soon as observed, suspend risky activity immediately if credible; escalate severe incidents to designated on-call.
- Ordinary mission inquiry: acknowledge within 1 business day.
- Publish actual operating hours and response expectations; do NOT advertise round-the-clock response unless staffed.
- Maintain ticket: case ID, affected accounts, timestamps, funding/transfer IDs, category, severity, owner, resolution and notification.

## H. Incident response and freeze policy
- Severity 1: lost funds, unauthorized payout, compromised administrative account, secret leakage, serious data breach or potential harm. Immediately suspend payouts/new missions and affected accounts using reviewed switches, rotate credentials, preserve logs and snapshots, alert provider/security/legal, activate incident communication plan.
- Severity 2: stuck transfer, webhook outage, incorrect fees, major service outage. Pause financial transitions, reconcile, notify support and provider as necessary; controlled rollback once evidence indicates safe state.
- Don't delete or overwrite suspect ledgers. Independent reviewer signs off on incident closure and restart. Evaluate notification deadlines with counsel.

## I. End-of-day and weekly tasks
- End of day: ensure zero unexplained financial discrepancies; review pending payouts and stalled/retried events; review fraud alerts and support backlog; check backups and audit trail.
- Weekly: test a restore in isolated storage, check duplicate/replayed webhooks, test worker and buyer roles, reconcile accounting exports, audit refunds/chargebacks, verify service eligibility and licenses, run vulnerability/patch review.
- Monthly: policy/fee disclosure audit, access review, infrastructure cost and unit-economics report, chargeback trend, user-pay complaints, privacy deletion requests and legal requirement change review.

## J. Release/change management
- Every code change on PR with tests and independent review; never commit live secrets.
- Deploy staging first, run workflows and finance-safe end-to-end tests; approve release with a named operator, rollback procedure, reconciliation baseline and on-call contact. Payments schema changes require rollback/migration plan.
- If any core gate fails, revert to private test mode; do not accept real payments or suggest 'we are live'.
