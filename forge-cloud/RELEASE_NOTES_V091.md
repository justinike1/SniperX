# Forge v0.9.1 — Cursor integration fix

- Corrected Earn Now view: pass `(feed,services)` to `earnContent` and bind the existing `bindEarn(feed)` handler instead of undefined `bindRadar`.
- Corrected UI test assertions to match the actual implemented field selectors/empty state; added a view-wiring regression test.
- All 31 automated tests pass; syntax checks pass on Node 22.16.0.
- No real paid missions, payments, live dispatch, identity or background provider verification.
- See root `CURSOR_HANDOFF_START_HERE.md` for safe import instructions.
