# CURSOR IMPLEMENTATION REQUEST — SAFE, ADDITIVE OPS OVERLAY
Target: `https://github.com/justinike1/SniperX`, latest `main` **after merged PR #9** (merge commit `e92d635e3bf5ebd16027ea34f6289f1252606723` was verified in this conversation). If main has changed, review all differences and do not overwrite existing modifications.

1. Create a new feature branch `cursor/forge-operations-readiness-oct24` from latest main. Do not touch any file outside `forge-cloud/` and `.github/workflows/forge-cloud-checks.yml`. Do NOT modify or access trading/wallet credential files in repo root.
2. Copy the additive files in this handoff into their matching paths (NO existing production file replacement). Carefully inspect for conflicts and run static checks.
3. Run `cd forge-cloud && npm run check && npm test`. Confirm 69/69 if previous 67 tests are still unchanged; report the actual result, do not assume. Node runtime at least v22.16.0.
4. Run backup/restore drill tests and show integrity details using temporary test DBs. The backup script creates unencrypted local snapshots: NEVER upload real client databases or their contents to GitHub, logs or Cursor. Configure encrypted offsite backups outside repo before production.
5. Check the full CI workflow syntax. Confirm GitHub Actions installs exact Node and triggers PR/push for Forge paths. Test CI on the PR. Ensure branch protection is later configured to require the check, which may require repo owner action.
6. Review operational/legal documents and label as draft/approval-blocked, NOT legally approved or launched. No live Stripe keys, bank accounts, Connect payouts, wages or payout marketing claims added in this PR.
7. Create a PR with honest test evidence, list modifications and unresolved blockers. Do not merge without my review, do not deploy, do not create any payment transfers or charges.

Final requirement: Produce an executable release checklist showing legal counsel approvals, Stripe approval, security review, real paid pilot, coverage and incident owners. Treat code tests as engineering evidence, not business authorization.
