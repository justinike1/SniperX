# Forge v0.7 — User-friendly interface and workflow review

## Intended users

- **Customer:** Quickly explain a digital service request, understand that the current beta is simulated, and track the request through review.
- **Participant:** Find third-party published openings, set up a skills profile for the test marketplace, and read personal verification-case tracking information.
- **Administrator:** Manage the pilot, navigate reviews, audit history, and sourced-job refreshes without exposing case details to unrelated users.

## New features implemented

1. Rewrote navigation and labels in everyday language: Home, Find jobs, My projects, Request a service, My work profile, Verification status, Admin workspace, Help & safety.
2. Responsive landing experience with clear benefit explanations, sign-in, invitation onboarding, and truthful beta disclaimers.
3. Role-specific quick-action cards and 3-step help guidance on Home.
4. Three-step customer request wizard: description, location/skills, and budget plus review. Required-field validation before progress, Back/Continue controls, review summary, and warning before leaving unsaved work.
5. Searchable project list with status filter and empty state.
6. Searchable sourced-job list with publisher filter, original-source links, readable retrieval dates, and truthful provenance warnings.
7. Native HTML dialog forms for assignment, approval, delivery, cancellations, incident reports, and administrative reviews (replacing JavaScript `prompt` and `confirm`).
8. Accessible skip link, keyboard focus outlines, clear progress labels, larger mobile tap targets, mobile horizontal navigation, and respect for reduced-motion preference.
9. FAQ-style Help & safety screen. Original backend release restrictions remain unchanged.

## Testing performed

- `npm run check`: passed.
- `npm test`: 19/19 backend tests passed.
- Playwright Chromium UI smoke checks: passed for role-specific home, request wizard validation and submission (mock API), project search/filter, job search/filter, admin navigation, worker profile navigation, and phone-width layout with no page overflow.
- The browser interaction test uses **synthetic mock data**. It does not establish a real employer connection, genuine account verification, payment readiness, full WCAG compliance, or production-grade security.

## What needs additional work

- Independent usability sessions with nontechnical customers and participants.
- Full keyboard and assistive-technology audit, including screen-reader workflows.
- Real UI end-to-end tests against an isolated development backend with test users (in addition to the current 19 backend tests and mocked browser smoke test).
- Centralized error handling, observability, data-handling policies, improved participant profile editing, and production database migration.
- Vendor authorization and legal procedures before any live identity, license, or background checks.

## No change to commercial release gates

The new interface makes the **private test** easier to use, but it does **not** enable real marketplace transactions, live worker dispatch, identity/background/licensing verification, or any public launch.
