# SniperX Forge — Mandatory launch gates (ALL FAIL as of prototype v0.3)

| Gate | Evidence required to pass | Current status |
|---|---|---|
| 1. Service classification | Counsel-approved permitted service catalog, hazard screening, prohibited-services enforcement | FAIL — demo screening only |
| 2. Identity and age | Independent ID, adult eligibility, business/customer verification and documented appeals | FAIL — demo self-attestation only |
| 3. Account security | Auth, MFA for privileged accounts, per-object authorization, penetration test, abuse-rate controls | FAIL — local-only server |
| 4. Privacy | Privacy notice, lawful basis/consent where needed, minimal collection, encryption, retention, breach response | FAIL — no production policy or infrastructure |
| 5. Worker legal position | Jurisdiction-specific worker classification and wage/benefit/legal review | FAIL — legal review not completed |
| 6. Insurance and permits | Applicable general liability, E&O, cyber and workers' comp assessments; permits/licenses validated | FAIL — no coverages reviewed |
| 7. Real work safety | Qualifying participants, safe scope and conditions, escalation owner, site protocols for in-person work | FAIL — no field operations |
| 8. Funds | Compliant payments, verified connected accounts, refunds, disputes, financial ledger and reconciliation | FAIL — no payments |
| 9. Incident response | Monitored emergency complaint intake, stop-work ability, response on-call, escalation playbooks and drills | FAIL — demo-only hold |
| 10. Fraud prevention | Real demand verification, anti-scam investigations, reports and repeat-abuser controls | FAIL — rule heuristic only |
| 11. Accessibility & fairness | Accessibility test, non-discriminatory matching review, customer/worker appeal process | FAIL — not assessed |
| 12. Operational readiness | Backups/recovery, production observability, error budgets, change management, owner accountability | FAIL — no deployed service |

**Decision rule:** No real dispatch, real payments, public user registration or externally hosted access until all gates are evidenced and signed off by responsible owners. Software changes alone cannot clear legal, insurance, operations or human safety gates.

## Suggested first pilot
Run interviews and manually scoped proposals first; if any real service is delivered, use appropriate lawful arrangements under independent legal/insurance guidance. Do not treat a simulated Forge mission as permission to perform work.

## Official reference points (checked October 2026)
- New Jersey Department of Labor, ABC worker classification rules: https://www.nj.gov/labor/lwdhome/press/2026/20260505_ABC.shtml
- OSHA temporary worker responsibilities: https://www.osha.gov/temporaryworkers
- FTC task scam guidance: https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams
- Stripe Connect marketplace compliance infrastructure: https://stripe.com/connect/marketplaces

This document is a development gate specification, **not legal advice**.
