# FOUNDER ACTIONS — THIS PACK DOES NOT REPLACE PROVIDER OR LEGAL APPROVAL

## 1. Stripe activation (owner's direct action)
- Sign in securely at https://dashboard.stripe.com/ using the legitimate Stripe account that will legally own Forge's merchant processing.
- Submit complete truthful business details, website, support contact, legal entity and permitted bank account in Stripe's secure dashboard. Never give secrets, financial account numbers, government ID numbers or passwords to a coding assistant.
- Describe actual business: service-project marketplace where buyer prepays and seller may receive a later approved transfer. Explicitly state early withdrawal is requested only where Stripe permits it; do not imply escrow, guaranteed instant payment or W-2 payroll.
- Complete any verification requests shown in the dashboard. Separately review Connect platform setup and responsibility for risk, disputes, negative balances and losses. Ask provider to confirm the recommended separate charges and transfers model and provider payouts. The initial `New business` connected account was read in TEST mode; verified `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`.
- Save approval/capability evidence **outside public GitHub** and enter only non-sensitive evidence references into `LAUNCH_GATE.md`. Do not start live charges before legal/signoff gates.

## 2. Attorney signoff (owner's direct action)
- Referral for Morris County: https://morriscountybar.com/referrals/find-a-lawyer/ . The referral office is not legal counsel itself. Ask for a New Jersey attorney handling employment/staffing regulation, contractor classification and payments/marketplace contracts. Its published fee cap for initial referral consultation is $50 for up to one half-hour; verify pricing directly.
- Send `forge-cloud/docs/COUNSEL_REVIEW_NJ.md` to appointed attorney, with demo screenshots and exact intended catalog/service categories. Ask for a written memo and edits to all contracts/disclosures. Do not publicly launch simply because counsel has been contacted.

## 3. Accountable operation (founder + support team)
- Assign named support, payment/reconciliation, fraud/risk, incident-response, security and coverage owners, even if a single qualified person initially carries multiple roles.
- Verify mission buyers and actual paid demand, start only with attorney-approved low-risk categories, keep employer W-2 shift inquiries away from contractor payments.
- Approve hosting and incident service provider, SSL/TLS, backup encryption key storage, access logs, service secrets and retention policy. Before launch, record a successful end-to-end provider charge, transfer, and bank payout, with receipts and reconciliation.

## 4. GitHub / Cursor handoff
The GitHub connector denied branch creation with HTTP 403. The handoff ZIP is uncommitted. Use `CURSOR_HANDOFF.md` on current `main` to add only CI/backup/docs and open a separate PR. Test both the new 2 backup tests and all existing tests. The working local copy has outdated front-end UI relative to merged `main`, so its older UX assertion failed; this is not an independent full-app pass on the current repository.
