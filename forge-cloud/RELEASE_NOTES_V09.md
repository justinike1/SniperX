# Forge v0.9 — Earn Now / Fashion Refresh

## Changes
- Rebuilt the signed-in Earn Now view around a premium charcoal-and-lime, mobile-first Mission Radar.
- Added actual `/api/earn/feed` discovery to the user interface, rather than showing service templates as available jobs.
- Added search, category filtering, test-mission detail view, empty state, and an honest zero-live-paid-missions indicator.
- Added eight clearly identified digital-service exploration cards.
- Improved typography, visual hierarchy, navigation affordances, responsive layout and reduced-motion handling.
- Preserved private-beta access controls, existing backend workflows, source feeds, and verification status limitations.
- Added four UI integration assertions to the existing test suite.

## Verified
- `npm run check` passes.
- `npm test` passes: 30/30 automated tests.
- The app served `/` and `/radar.css` with HTTP 200 in local smoke checks.

## Not yet implemented
- Live customer-funded mission supply, production dispatch, payment collection or payout, vendor-backed identity verification, approved background screening, insurance and jurisdictional review, or public production readiness.
- This remains a private-beta application. Never present demo missions as available paid work.

## Start
Node.js >=22.16, from this folder: `npm run check && npm test && npm start`.
See README.md for setup and admin creation. Keep all private credentials out of source control.
