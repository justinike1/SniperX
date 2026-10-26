# FORGE RELEASE AUTHORIZATION — ZERO-ASSUMPTION GATE
**Current decision: NO-GO FOR LIVE CUSTOMERS OR PAYMENTS.** Date: 2026-10-24.
Only change to GO after ALL required evidence is attached, signed and independently tested. An automated unit test does NOT supersede a missing approval.

| Gate | Owner | Required evidence | Current status |
|---|---|---|---|
| Business identity/merchant review | Founder + Stripe | Live business details accepted, Stripe permits actual use case, live charges enabled | BLOCKED: connected account test mode, charges disabled |
| Connect account/onboarding | Engineer + Stripe | Platform Connect profile/capabilities active, hosted worker onboarding; test eligible and ineligible connected accounts | BLOCKED |
| Real funds & transfers | Payments engineer | Live implementation with signature-verified webhooks, idempotent source-backed transfers, reversals and payout status; amount/currency reconciled | BLOCKED: test-only code |
| Money movement legal basis | NJ payments counsel | Signed opinion on fund custody, charge type, money transmission/escrow characterization, consumer disclosures, reserves | BLOCKED |
| Labor & licensing | NJ employment attorney | Signed category-specific ABC classification and employment/job listing/temp-service license determination | BLOCKED |
| W-2 shifts | Licensed employer/staffing partner and counsel | Payroll and wage compliance, insurance, registration/license | OUT OF SCOPE — MUST REMAIN OFF |
| Worker and customer verification | Risk lead | Approved identity, business, sanctions where required, qualification workflows and independent verification providers | BLOCKED |
| Refunds, disputes & account loss | Finance + legal | Functional tests incl. chargeback after transfer, correct reserves and reconciled balances; written refund and chargeback SOP | BLOCKED |
| Insurance | Broker + counsel | Bound policies with stated operations and coverage limits; exclusions analyzed | BLOCKED |
| Security & data privacy | Security lead + lawyer | Independent penetration review, secrets scanning, MFA, privacy notice, retention, incident plan, fix critical/high findings | BLOCKED |
| Availability and recovery | DevOps | Secured deployment, HTTPS, uptime alerting, encrypted offsite backups, documented RTO/RPO and successful restore drill | BLOCKED |
| Customer demand | Founder + operations | Genuine verified customer commitments and accurate funded job inventory | BLOCKED |
| Controlled real paid pilot | Founder + finance | Independently observed payment-to-transfer-to-bank payout with reconciled documents, after approvals | BLOCKED |
| PR quality controls | Engineer | GitHub CI, protected main, code review and production change control | ADDITIVE CI PREPARED, NOT APPLIED |

## Launch signature block — must be dated AFTER all evidence exists
Legal clearance reference: __________________________
Stripe live approval evidence/reference: __________________
Insurer policy number/reference: _____________________
Financial reconciliation test ID: _____________________
Security review ID: _________________________________
Operations runbook owner: ___________________________
Founder decision: [ ] NO GO   [ ] LIMITED PILOT GO
Signature / timestamp: ______________________________

## Freeze triggers (any one revokes GO)
1. Mismatch between collected customer charge, release authorization and net provider transfer.
2. Missing confirmed eligibility/identity, suspicious account activity, or revoked Stripe ability.
3. Unauthorized transfer, critical exploit, credential leak, missing audit logs or absent working backups.
4. Material labor-law/registration/insurance concern for any live service category.
5. Widespread delayed payouts, material chargeback reserves deficit or inability to support workers.
6. Product marketing claims faster payout or guaranteed income when eligibility/availability is unknown.

To restart after freeze: incident report, reconciled corrections, independent review and new release authorization.
