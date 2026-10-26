# SNIPERX FORGE — LIVE LAUNCH GOVERNANCE & OPERATIONS HANDOFF
Prepared October 24, 2026. Status: **NOT AUTHORIZED FOR LIVE OPERATION**.

## Verified facts
- Repository: `justinike1/SniperX`; Forge app lives under `forge-cloud/`, separate from trading-related files.
- PR #9 merged into GitHub `main` in this conversation. Stripe Checkout integration is **test-only**; payout ledger is **simulated**. No Stripe Connect live transfers exist in deployed code.
- One Stripe connection labeled `New business` is in TEST MODE. A read-only Stripe account check returned `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false` and `requirements.disabled_reason=requirements.pending_verification`. This is NOT Stripe approval.
- New additive maintenance code in this package: GitHub Actions CI, a consistent SQLite backup tool, restore verification and 2 passing focused tests. The code has not been committed to GitHub; no live billing or deployment changes.

## What is in the packet
- `forge-cloud/tools/backup-sqlite.mjs`: consistent online SQLite WAL snapshot; refuses overwrite; integrity-checks, SHA-256 hashes; does NOT encrypt.
- `forge-cloud/tools/verify-sqlite.mjs`: read-only restore verification; no overwrite, no live restore.
- `forge-cloud/tests/backup.test.mjs`: 2 targeted tests.
- `.github/workflows/forge-cloud-checks.yml`: GitHub PR/push validation on `forge-cloud` changes using Node 22.16.
- `forge-cloud/docs/LIVE_PAYMENTS_APPROVAL.md`: Stripe marketplace model, acceptance criteria, payout policy.
- `forge-cloud/docs/COUNSEL_REVIEW_NJ.md`: concrete written counsel questions and clearance evidence.
- `forge-cloud/docs/OPERATIONS_SOP.md`: daily operational procedures, disputes, safety, emergency escalation, customer support.
- `forge-cloud/docs/LAUNCH_GATE.md`: signable go/no-go ledger with evidence and approval owners.
- `forge-cloud/docs/LEGAL_DRAFT_NOTICES.md`: non-final preliminary customer/worker notices requiring legal approval.
- `forge-cloud/docs/FAILURE_SCENARIOS.md`: financial, operational, security failure-case drills.
- `CURSOR_HANDOFF.md`: step-by-step guarded installation without rewriting GitHub `main`.

## Ownership and signoffs required
1. **Founder (you):** provide truthful legal business identity, beneficial ownership, website, business profile, support details, and bank account privately to Stripe. Do not paste SSNs, login or secret keys in chat, GitHub or Cursor. Do not assume payments are approved until Stripe reports the capabilities are enabled in the actual LIVE account.
2. **Stripe / qualified payments provider:** approve the marketplace activities and Connect account model; confirm charges, transfers, and payouts enabled in LIVE mode; confirm who bears refunds, disputes, negative balances, fees, reserves and worker country eligibility.
3. **New Jersey attorney:** review and sign off on labor classification, employment agency/job listing/temporary help firm registration, money transmission/escrow characterization, service contracts, privacy, worker safety, insurance and marketing claims. Counsel determines whether additional states' laws apply. This packet is not attorney-client legal advice.
4. **Independent security assessor:** review the live environment including session auth, data access controls, service-specific abuse and financial webhooks. Fix severe findings and test backups and recovery.
5. **Operations owner:** demonstrate proof of identity and genuine paying buyers, first paid mission and correct actual payout + reconciliation (after approvals), dispute/refund processes and user support capacity.

## Pilot scope recommendation
Limited invite-only North Jersey **remote professional services only** with a small fixed catalog (e.g. design/editing/digital setup) AFTER counsel explicitly approves individual service categories and independent provider status. No real W-2 shifts, childcare, medical services, rides, hazardous tasks, on-site physical labor, regulated work or urgent emergency services until independently authorized. No paid worker application fees. No promise of same-day payout, guaranteed jobs, 'escrow', insured balances or banking services.

## Stop signs
If any required approval or safeguard is absent, **do not enable live checkout, Connect transfers, withdrawal buttons for real funds, marketing promises, or general registrations**. Test-only checkout and simulation may remain for development. `npm run check`, unit tests and bank provider testing are necessary but not sufficient launch authorization.
