# Security architecture — actual controls vs future commitments

## Implemented and tested

- One-time CLI administrator creation (no default admin credential, no public admin registration).
- Invitation-only buyers and workers, roles stored server-side, ownership-scoped access to missions.
- Password hashing using scrypt and random per-user salt; generic wrong-credential errors.
- HTTP-only session cookie, hashed token storage, session expiry, explicit logout, SameSite=Strict and HTTPS Secure flag.
- Per-session CSRF token for authenticated writes, origin checking for browser requests, conservative Content Security Policy and browser security headers.
- Maximum JSON request size, typed domain validation, constrained mission category selection, basic per-IP request throttle.
- Safety-hold incidents block further demo progression, with event journaling and simulated human approval.
- No money movement, no real human dispatch. Displayed compensation and platform totals are demonstrably simulated.
- Externally fetched employment listings are source-tagged with canonical HTTPS apply links, timestamps and expiry filtering.

## Unimplemented before public launch

- Independent penetration test and automated dependency/security assessment suitable for deployed target.
- Admin MFA, password recovery with verification, email ownership validation, session rotation and granular privileges.
- Production SQL backend and resilient multi-instance operations; immutable append-only, tamper-evident audit retention.
- Distributed WAF/rate limiting, backups+restore drills, monitoring, load tests, disaster recovery, alert triage.
- Fraud detection, buyer/business identity verification, appropriate worker identity verification and provider webhooks.
- License checks per profession/jurisdiction, independent credential verification and renewal monitoring.
- Properly authorized background-screening workflow (disclosure, consent, report review, FCRA/adverse-action controls where applicable), vendor contracting, individual privacy protections.
- Appropriate insurance, legal operating model, worker classification, tax reporting, employment marketplace permissions and disputes/incident response staff.
- Third-party security assessment, real payment provider, ledger reconciliation, taxes, chargebacks and authorized payouts.

## Principle

A status like `DEMO_REVIEWED` is **never** an identity, license or background check result. Browsing external jobs must not require a background check. Never save sensitive screening reports or ID photos in normal mission records. Require consent, lawful scope, minimum collection and proper retention/deletion policies before provider onboarding. Automated reasoning must not approve dangerous scopes or adjudicate sensitive employment decisions without human/legal review.
