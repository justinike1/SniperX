# SniperX Forge v1.1 — Safe pilot finalization package

**This package is safe for a Cursor *development handoff*, not a public product launch.** It advances customer payment testing while keeping zero-dollar sandbox wallets and real wages separate.

## Deliverables

- `FORGE_V11_PILOT_PATCH_FROM_MAIN.diff` — 10 files restricted to `forge-cloud/`.
- `install_v11.py` — SHA-guarded preflight and installation (no external calls, no commit, no push).
- `CURSOR_ONE_SHOT_PROMPT.txt` — send this to Cursor as a single prompt with the files.
- `FINALIZATION_SUMMARY.md` — what is built, verified and still blocked.
- `forge-cloud/` — source tree for local inspection and automated test runs. Note: its browser files are inherited from the *local audited snapshot* and may differ from latest GitHub; **DO NOT copy this tree over GitHub main**. Only apply the patch.

## Technical outcome

Stripe-hosted Checkout **test** sessions can be created for an authenticated buyer's mission, and signed test webhook events are independently verified, deduplicated and reconciled to the mission's expected amount. No live key is accepted. These test-payment records do not release wallet funds or initiate bank transfers.

New read-only financial audit checks the sandbox wallet for double-release, missing release, bad payout fee arithmetic, refund failure and negative running balances; there is an admin API and local CLI. Launch gates remain blocked until actual merchant/worker identity verification, Stripe Connect production design, legal/insurance/security work, and real customer testing.

## Test evidence

- Node.js 22.16.0 `npm run check`: passed.
- Node.js 22.16.0 `npm test`: 67 passed, 0 failed (all code and network responses mocked; no actual Stripe API call).
- `git apply --check` against a pristine local Forge snapshot: passed.
- `git diff --check`: passed.
- Exact baseline Git blob hashes for the four changed existing backend files were reverified against GitHub `main` after PR #8 merged.
- No independent payment-provider acceptance, penetration test, real-money transfer, deployment or production browser smoke was performed.

## How to install

Use the one-shot Cursor prompt. If applying yourself, from the repository root:

```
python3 /path/to/handoff/install_v11.py --repo .
git switch -c forge/stripe-test-pilot-v11
python3 /path/to/handoff/install_v11.py --repo . --apply
cd forge-cloud && npm run check && npm test
```

The script stops if code has drifted from the audited GitHub baseline, if new files already exist, or if Forge has uncommitted changes.

Do not upload your Stripe secrets into Cursor/ChatGPT/GitHub. No public deployment and no worker payouts yet. The final founder signoff is required before any real-money activation.
