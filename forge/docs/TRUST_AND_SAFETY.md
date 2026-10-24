# SniperX Forge — Trust & Safety Controls

Version: 0.3 (local prototype). Owner: founder; designate trained incident owner before any pilot.

## A. The only honest current status

- **Sandbox only.** Localhost binding, no real worker dispatch, no real payment processing, and no independently verified customer or worker identities.
- **Never deploy this prototype to the public Internet.** There are no real user accounts, authentication, role-based permissions, or production secrets management.
- Fictional mission states (ASSIGNED, COMPLETED) and monetary totals must NEVER be called real work, payouts, receivables, or earned income.
- Screening uses a **conservative keyword heuristic**, not a safety certification, fraud detection guarantee, professional licensing check, or substitute for trained human review. Known unsafe requests may evade text screening.
- Emergency notifications **do not exist**. If there is immediate danger, call local emergency services. The demo's safety-hold button does not notify them or provide urgent response.

## B. What the 0.3 prototype actually enforces

1. Listens on loopback only; refuses non-loopback bind and unexpected Host values (reduces accidental exposure and DNS-rebinding risk).
2. Random per-process CSRF nonce for state-changing requests, same-origin enforcement, strict request size cap, rate limiting, JSON content-type restriction and basic security headers. Local token is not user authentication.
3. Rejects some known-dangerous requests at intake; requires recorded human-*simulated* scope review before demo approval, and rechecks prohibited scope on transitions.
4. Requires an adult self-attestation for fictional participants; all remain **DEMO_UNVERIFIED**. Self-attestation is not age/identity verification.
5. Workers must meet stated skills, scheduling, pay and locality/remote delivery criteria. No category grants real-world professional qualification.
6. A reported demo safety incident sets a one-way **SAFETY HOLD**; assignment progress is blocked except cancellation. No notification or external escalation occurs.
7. Input length, type and basic content checks. Browser escapes user text. Local state files have restricted filesystem permissions where supported.
8. Demo-only monetary splits with no actual charges, escrow, transfer, payout or financial integration.

## C. Narrow allowable first live pilot (after independent approvals)

Favor remote-only digital content creation, proofreading, presentation formatting, and straightforward design work using customer-provided non-sensitive assets. No real job should run until all required identity, business, and scope checks pass.

Do **not** launch with: electrical work, structural or roofing repair, work at heights, chemical/hazardous exposures, security/surveillance, transportation of people, childcare, medical or personal care, work involving vulnerable adults, large financial transactions, sensitive credentials, deceptive reviews, questionable parcel reshipping or task-for-deposit schemes. The examples are not exhaustive. Add licensed or high-hazard categories only after category-specific legal, safety, insurance, training and operational approval.

## D. Production safeguards to design (NOT implemented)

### Identity, permissions and data protection
- Role-based accounts: customer, participant, independent reviewer, and administrator; MFA for administrators; verified email/phone; session expiry; strong reset flow.
- Enforce ownership checks on **every** object request. Customer sees their jobs; participant sees only authorized assignment data. Admin actions require separate permission and audit trail.
- Age verification appropriate to applicable law, with adults-only launch. Do not claim background-check clearance without lawful, auditable provider verification.
- Minimize personal data; explicit consent; encryption in transit and at rest; deletion and retention schedule; access logging; breach response; user access and correction requests.
- Independent security testing, dependency scanning, abuse monitoring, recovery backups, red-team review of AI-created mission scopes, and a documented vulnerability process.

### Worker and customer safety
- Verify customers, service addresses when relevant, participant identity and appropriate qualifications. Never treat AI scores as credentials.
- Written scope, price, location, operating hours, deliverables, site conditions, materials, cancellation terms, and prohibited conduct before acceptance.
- For future in-person work: hazard classification, incident procedures, safe-contact arrangements, training, equipment rules, insurance and applicable license checks. Do not launch in-person categories without a safety professional's approval.
- Never give emergency, legal, health or safety instructions solely through generative AI. Keep human escalation and emergency pathways obvious.
- Allow participants to decline or leave unsafe assignments without punishment. Define anti-harassment, discrimination and retaliation protections.
- Assign a trained person to triage complaints and safety reports; give users a contact method, response commitments, escalation routes and incident preservation workflow.

### Payments, fraud and legal protections
- Use a marketplace payment provider with verified onboarding, appropriate KYC, refunds, disputes, webhooks, reconciliation and idempotency. Avoid custody of funds unless separately qualified and advised.
- Never require a worker to pay a deposit or transfer crypto to unlock work or withdraw compensation.
- Verify demand is real and a customer has agreed to pay; do not fabricate jobs, ratings or customer endorsements.
- Obtain review by qualified counsel on employment/independent-contractor classification, terms, service contracts, privacy, consumer protection, licenses, tax obligations, insurance and geographic operations.
- Obtain insurance advice for general liability, professional liability/errors and omissions, cyber liability, and workers' compensation where applicable. Coverage varies by activity and classification.
- NJ's October 2026 updated ABC-test regulations make worker classification especially important for a New Jersey-first launch.

## E. Immediate incident protocol for a future real product

1. If immediate danger: instruct caller to contact 911 or local emergency responders; do not imply SniperX itself has placed the call.
2. Stop/disallow the assignment immediately, prevent reassignment, preserve evidence and relevant access logs without unnecessary sharing.
3. Notify the designated trained safety owner through a tested, monitored operational channel; check on impacted people by appropriate means.
4. Escalate potential injury, threat, criminal conduct, child safety, financial fraud and privacy breach to suitable professionals or authorities as legally required.
5. Record time, reporter, affected assignment, incident nature, actions taken, retention and follow-up. Restrict access to sensitive details.
6. Decide whether the entire service category or marketplace should be paused until a corrective-action review is complete.

**No real incident-response operation exists in this demo. Do not use this document as a substitute for a response team or emergency service.**
