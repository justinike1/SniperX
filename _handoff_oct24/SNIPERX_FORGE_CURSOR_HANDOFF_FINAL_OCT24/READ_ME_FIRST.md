# SniperX Forge — Single Cursor Handoff (October 24, 2026)

**Use THIS handoff only.** It replaces the earlier individual v0.9, payout, Earn Today, and W-2 patches. Do **not** upload or apply previous ZIPs/patches alongside it.

## What this installs

Changes are **restricted to `forge-cloud/`** inside the existing `justinike1/SniperX` repository.

1. Earn Today discovery: Today, Next 48 Hours, Career Jobs, with clear job provenance. An urgent customer request is **not** a verified same-day job.
2. Worker self-declared availability, expiring after selected hours.
3. Quick customer digital-service project intake, requiring admin review before demo discovery.
4. Separate W-2 shift **inquiry** intake, held for employer, staffing, legal, and payroll review—never auto-published.
5. Persistent simulated wallet, standard/faster simulated payout quotes, idempotent reservations and failed-payout restoration.
6. Additive mobile navigation, payout UI, quick-post UI and Fast Lane UI **without replacing the newer Earn Now UI already on GitHub `main`**.
7. Automated tests for all of the above, including role-based access and simulated payment integrity.

**The software does not process money, dispatch workers, independently verify identities, conduct actual payroll, operate a live job marketplace, or guarantee same-day cash.** None of those launch gates were passed.

## How to give it to Cursor

Open the existing `justinike1/SniperX` GitHub repository in Cursor. Unzip this handoff into a **separate folder outside the repository** so the package itself isn't added to Git. Paste the contents of `CURSOR_ONE_SHOT_PROMPT.txt` into Cursor chat, replacing `PATH_TO_HANDOFF_FOLDER` with the folder containing this file.

Cursor should run these steps **from the Git repository root**:

```bash
# 1. Check that the Forge area is clean and matches the audited main snapshot.
python3 PATH_TO_HANDOFF_FOLDER/install_handoff.py --repo .

# 2. If preflight succeeds, create an isolated feature branch.
git switch -c forge/earn-today-handoff-oct24

# 3. Apply the fully scoped, prechecked backend patch and additive UI merge.
python3 PATH_TO_HANDOFF_FOLDER/install_handoff.py --repo . --apply

# 4. Test and inspect the exact installed code.
cd forge-cloud
node --version   # Node 22.16.0 or later
npm run check
npm test
cd ..
git diff --check
git status --short
```

The installer refuses to continue if it detects unexpected GitHub file versions, dirty Forge files, missing UI anchors, or an incompatible patch. **If it stops, do not force it or overwrite GitHub files.** Have Cursor report the exact issue. The command does not push, deploy, install packages, alter the trading bot, or enable payments.

## Evidence from our local audit

- `npm run check` succeeded with Node 22.16.0.
- `npm test`: **53 passed, 0 failed**, on a clean audited Forge snapshot plus this handoff installer.
- Independent end-to-end API checks: **18 passed, 0 failed**, including authentication, authorization, mission lifecycle, CSRF, safety holds, persistence and release gates.
- Offline mocked Chromium UI smoke: **4/4** passed (worker desktop/mobile and customer desktop/mobile). Checked Earn Today, career views, test wallet, quick posting, W-2 inquiry tab, responsive overflow and uncaught page errors.
- Verified **nine application UI integration anchors** against current GitHub `main` `public/app.js` blob `cf2335460e7d5430e6f3e30e9f086a22a2cacefb`; backend hashes matched the audited repository version.
- `git diff --check` passed and tracked changes remained scoped to `forge-cloud/`.
- Re-running the installer in the already modified workspace stopped as designed.

**Limit of that evidence:** The exact latest GitHub interface could not be downloaded into the local browser environment for a fully joined current-main browser test. The installer was run locally against the earlier audited file snapshot while verifying its new UI edit anchors directly against GitHub `main`. Cursor must run a complete browser smoke after installing onto the real latest `main`. Tests are not independent penetration testing or a legal review.

## Rules Cursor must preserve

- NEVER claim actual funded jobs, verified workers, issued W-2 wages, real bank transfers, or guaranteed instant payouts.
- Do not connect a payment provider to live mode. Demonstration-only money must be labeled and segregated.
- W-2 payroll must remain separate from contractor-style marketplace payouts; legal classifications require specialist review.
- Do not edit files outside `forge-cloud/` or touch older cryptocurrency/trading/wallet files.
- Do not change repo visibility, publish/deploy, push a branch, or commit until the founder reviews the diff and approves.
- Preserve GitHub's more recent Earn Now design. Don't replace it with the older ZIP's `app.js` or `radar.css`.
- Require verified buyer-funded demand, legal/insurance compliance, identity and banking provider onboarding, reconciled ledgers, disputes, fraud controls, and security assessment before any real-money pilot.

## Files in this handoff

- `install_handoff.py` — guarded merge installer and dry-run preflight.
- `FORGE_BACKEND_PATCH_FROM_MAIN.diff` — backend, tests, index HTML and package changes (does not include conflicting app.js or radar.css patches).
- `assets/forge_ui_features.js` — additive Fast Lane, wallet and quick-post JavaScript.
- `assets/forge_new_feature_styles.css` — additive styles without reverting the existing UI.
- `assets/expected_git_main.json` — exact audited file hashes for drift detection.
- `assets/source_reference/` — individual new source and test files for review, NOT for duplicate installation.
- `tests/independent-check-results.json` — independent API results.
- `tests/browser-smoke-results.json` and `tests/offline_browser_smoke.py` — four simulated Chromium UI checks, explicitly not live browser/API integration.
- `CURSOR_ONE_SHOT_PROMPT.txt` — one instruction to hand Cursor.

## What remains for a real launch

Paying customers and genuine funded missions; approved payout/payroll partner integrations and compliance; formal worker classification; business and participant verification; banking/settlement ledger reconciliation; legal, insurance, privacy and independent security reviews; backups, operations and ongoing incident response.

**Status: ready for Cursor development handoff, NOT production launch.**
