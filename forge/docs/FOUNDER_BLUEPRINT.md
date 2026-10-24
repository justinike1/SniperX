# SniperX Forge — Founder's operating blueprint

## North star
Create a system that takes **genuine buyer demand** and connects it to fairly compensated work performed by qualified people, assisted by AI tools. SniperX should make economic participation easier, but never advertise invented work or guarantee earnings.

## First beachhead
North Jersey owner-operated businesses needing a repeatable **business-visibility package**. This is a test hypothesis, not a researched claim of demand. Proposed pilot deliverable: 10+ usable images, improved listing copy, and three ready-to-post social captions, subject to customer scope and participant capabilities. Photography, design, and content handling need explicit customer rights and approval.

Why this service initially: tangible deliverables, observable buyer acceptance, relatively limited inventory, and direct sales can test demand without waiting for a huge two-sided marketplace. Do not scale to other categories until the first is repeatable.

## Unit economics hypothesis
For a hypothetical $249 package, a 28% platform fee produces $69.72 gross platform revenue and $179.28 gross participant compensation. The fee is illustrative; it must be tested for fairness and costs. Consider actual acquisition expense, payment processing, refund reserves, taxes, insurance and support. Avoid publishing the $69.72 as profit.

## First 5 customer pilot
- Speak with 20 independent business owners about an actual current service need. Record requirements, budgets, turnaround needs, and rejection reasons with permission.
- Secure 5 paid orders with a written scope, clear eligibility, cancellation terms, delivery standard, and payment timing; do not use dummy orders as commercial proof.
- Identify and verify qualified participants. Confirm required licenses, worker classification, scope, insurance needs, privacy, and intellectual-property ownership with professional guidance.
- Manually coordinate each project and log evidence of completion and buyer acceptance.
- Evaluate contribution margin and participant compensation after real expenses; ask whether each customer would buy again.

## Product milestones

### Stage A — Sandbox (v0.2, delivered)
Functional local demo that validates missions, scores single-worker matches, enforces status transitions, calculates simulated splits, detects skill/location coverage gaps, and persists demo state. All people and buyers are fictional; no funds move.

### Stage B — Private pilot software
- Create separate customer, participant, and operator identities with scoped roles.
- Use Postgres with migrations and audited mutation logs.
- Add permissioned opportunity publication and expiry; service listings are visible only after buyer verification and participant eligibility review.
- Create evidence upload with access control and retention periods.
- Use idempotent assignment transitions and duplicate-request protection.
- Instrument application time, no-show rate, on-time delivery, accepted deliverables, qualified leads and rebooking.

### Stage C — Real transactions
- Integrate verified onboarding and approved marketplace payment provider architecture. Never create an internal escrow without legal and provider review.
- Terms, refunds, chargebacks, tax forms, and payout timing must be accurate and transparent.
- Reconcile processor events into an immutable event ledger; mark money as paid only after settlement confirmation.
- Set up human dispute and fraud review and transparent suspension/appeal procedures.

### Stage D — Opportunity creation intelligence
- Collect demand first from customer purchase requests and opt-in inquiries, not speculative trends.
- Estimate what skill bundles, staffing, equipment, and time are needed to fulfill each request.
- Recommend a single participant or a qualified multi-person team, with risk flags and explainable scoring.
- Run experiments measuring completion speed, payouts, buyer satisfaction, and fair access, not AI-generated activity.

### Stage E — Scale carefully
Only expand geographic areas/categories after identifying repeat buyer demand, viable contribution margin, reliable fulfillment, and acceptable participant outcomes. Introduce insurance/licensing policy per category. Do not expand solely based on signup counts.

## Metrics that count
1. **Verified completed missions**: real work accepted by a paying buyer.
2. **Participant net earnings**: total received minus directly incurred costs, collected only with consent.
3. **Contribution margin per order**: platform fee less incremental costs.
4. **30-day buyer repeat rate** and refunded order rate.
5. **Median time to first paid mission** for eligible participants.
6. **Fraud/dispute rate** and time to fair resolution.

## Engineering do-not-cross lines
- Do not modify the legacy trading runtime while bootstrapping Forge.
- Do not reuse trading confidence scores as real-world ability assessments.
- Never call simulated earnings "paid", "verified", or "real".
- Do not expose the local prototype server publicly; it has no authentication.
- Do not introduce applications submitted on behalf of participants without their approval.
- Do not give participants a false impression that every application or assignment will generate income.

## Next Cursor build request
Work inside `forge/`. Preserve the existing standalone sandbox and its tests. Propose a Stage B plan for identity-based customer/worker/operator roles, a Postgres schema with migrations, event-sourced mission transitions, genuine buyer verification workflows, and human review before publishing jobs. Implement one vertical slice at a time with automated access-control and integration tests. Keep all payment actions simulated until approved processor integration, legal review and reconciliation are complete.
