# FINANCIAL & SAFETY FAILURE DRILLS — PREPRODUCTION
Owner: payment engineer / operations risk. All tests required in test mode before any live approval. Evidence: test IDs, screenshots, DB read-only audit, provider status, support scripts and independent reviewer.

| Case | Injection | Correct observable result |
|---|---|---|
| Duplicate charge webhook | send same signed event twice | one durable event and exactly one payment status transition; no worker payout |
| Modified webhook | tamper raw JSON or timestamp | signature verification fails; nothing credited |
| Wrong mission price | charge amount differs from accepted mission | flag and freeze; no transfer entitlement |
| Wrong currency | source USD but payout other currency | reject or explicitly convert under approved flow, never silent mismatch |
| Card authorization not captured | checkout initiated but customer declines | mission not advertised as paid/funded |
| Asynchronous failure | ACH still pending, later fails | no worker transfer; inform buyer/worker |
| Two acceptance callbacks | concurrent buyer acceptance | at most one transfer-intent; no double transfer |
| Lost network after transfer | provider succeeds but request times out | query by idempotency and provider ID; never retry blindly |
| Funds temporarily unavailable | confirmed charge but available balance insufficient | hold transfer and retry safely once availability confirmed |
| Worker account suspended | Connect capability disabled after assignment | payout blocked, worker notified, funds handled under approved policy |
| Bank rejects payout | provider sends failure/return webhook | mark payout failed, no 'deposited' statement; support and reconciliation |
| Chargeback after payout | buyer disputes weeks later | reserve and transfer-reversal protocol; no secret negative balance |
| Buyer refund after transfer | refund confirmed | platform liability and provider recovery audited; avoid double debit |
| Worker fraud report | fake proof or scam request | immediate safety hold, preserve evidence, stop unexecuted transfers |
| Buyer disappears | never accepts or disputes | documented, counsel-approved timeout and adjudication; no arbitrary release |
| Zero payout fee | fee pricing changed | standard option clearly free to worker if offered; net math verified |
| Instant payout not eligible | account lacks eligible destination | hide/disable button; show accurate processing alternatives |
| Admin compromise | rogue settlement attempt | MFA, RBAC, approval separation and immutable log; rapid freeze available |
| SQLite WAL corruption | snapshot while requests write | backup API creates consistent snapshot; verify integrity and restore to isolated location |
| Worker data exposure | IDOR against wallet/mission endpoints | no cross-account data; safe incident handling and notification plan |
| Discriminatory marketplace | unfair screening or exclusion | monitored compliance decision; appeal process documented |
| External job expired | aggregator still lists closed posting | provenance and freshness displayed; stale listing expired |
| Emergency support overload | many users report unpaid work | activate incident support and status page; no false promise, escalation with deadlines |

## Acceptance standard
Each applicable row: `[ ] PASS [ ] FAIL [ ] NOT APPLICABLE` with test evidence and reviewer. Any outstanding high-risk failure keeps live launch **NO GO**.
