# Verification Center v0.6 — implemented behavior and hard stop conditions

**This is a case-tracking system, not a screening or verification product.**

## What is wired end-to-end

A private-beta administrator can create a case for a known account, with one of four kinds: IDENTITY, BACKGROUND, LICENSE, BUSINESS. The subject can read only their cases and acknowledge the existence of the tracking workflow. The administrator can record a scoped manual review; review actions are associated with a logged-in admin and append an audit event. Every case is persisted in a local SQLite table with per-subject indexes. API and browser UI are implemented. Tests exercise user isolation, CSRF, status validation, evidence URL restrictions and no-false-verification protections.

The browser labels these states correctly:

- `AWAITING_ACKNOWLEDGEMENT`: A case was created, but the subject has not acknowledged it.
- `AWAITING_PROVIDER`: Subject acknowledged the tracking record, but no external provider has been connected.
- `REVIEW_REQUIRED`: An administrator believes further investigation is necessary.
- `MANUAL_EVIDENCE_RECORDED`: An administrator entered a note and a New Jersey registry URL. **This is not authoritative verification** and never establishes eligibility for regulated work.
- `REJECTED` and `CANCELLED`: The local case is closed. These are workflow states, not formal employment adverse-action determinations.
- `EXPIRED`: Computed display state when a recorded license-expiry date has passed.

The code intentionally exposes no action to set `VERIFIED`; the eligibility helper always denies regulated-work access pending independent provider-backed verification infrastructure.

## Privacy and security properties

- No raw ID scans, face templates, social security numbers, biometric data, conviction reports or criminal history are collected.
- Privileged routes require the existing private-beta admin session and anti-CSRF check.
- Subjects can see only their own cases, not reviewer's internal notes.
- Reviewer notes and registry URLs are visible only to admins.
- Each record change emits an audit event; current SQLite event logs are **not tamper-evident** and do not meet enterprise audit standards.
- Registry references accept only HTTPS on `.nj.gov`, `nj.gov` or `newjersey.mylicense.com`, with no URL credentials, fragment or alternate port. A domain allowlist is not proof a specific case or license is real.
- Manual license reference entry currently supports New Jersey only.

## Critical legal boundary — consent

Clicking `Acknowledge workflow` is **not** identity-screening authorization and **not** FCRA-compliant written authorization for background screening. It only records that the subject saw a tracking case. Do not connect the acknowledgement endpoint to a real screening vendor or submit background checks based on this flag.

For employment-purpose consumer reports, consult qualified counsel, the applicable screening provider, and the federal/state requirements for standalone disclosure, written authorization, permitted purpose, adverse-action procedures, fairness, individual assessment, retention and disputes.

Official reference: https://www.ftc.gov/business-guidance/resources/background-checks-what-employers-need-know
New Jersey government-backed license lookup: https://newjersey.mylicense.com/Verification/

## API endpoints

| Method | Path | Access | Behavior |
|---|---|---|---|
| GET | `/api/verification/me` | Signed-in account | Own cases, limited to 100, no internal review notes |
| GET | `/api/verification/me/eligibility` | Signed-in account | Regulated-work access always blocked until live external verification |
| POST | `/api/verification/cases/:id/acknowledge` | Owning account | Records non-legal workflow acknowledgement |
| GET | `/api/admin/verification/cases` | Admin only | Recent 100 cases including internal review details |
| POST | `/api/admin/verification/cases` | Admin only | Creates case in awaiting-acknowledgement state |
| POST | `/api/admin/verification/cases/:id/review` | Admin only | Restricts decision to REVIEW_REQUIRED, REJECTED, CANCELLED, MANUAL_EVIDENCE_RECORDED (license-only) |

## Enterprise provider integration is NOT implemented

Before any real screening, add the provider's verified server API (under a paid, approved account), provider-hosted enrollment, signed and replay-safe webhooks, independent reviewer attestations, encrypted/minimized personal-data retention, user correction rights, reports access policies, audit event integrity, consent and adverse-action flows that have been legally reviewed. For licenses, use authoritative databases or permitted official bulk export after terms review, include discipline/restrictions and name matching, verify expiration and permit humans to correct mismatches.

A future authenticated provider event must not map background screening reports directly into blanket automatic disqualification. An appropriate human reviewer and legally compliant adverse-action procedure remain mandatory when applicable.

## Significant architecture risks to remediate

This build retains the earlier **single-instance SQLite private beta**, not a horizontal Postgres deployment. There is no field encryption implementation for sensitive records, no MFA enforcement, no production WAF, no vetted identity/screening vendors, no backup and restore exercises, no monitored incident responder, no payment integration, and no penetration test. Do not use for real transactions or make it public.
