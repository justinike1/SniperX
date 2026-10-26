# Migration 0001 — Initial durable website datastore

Date: 2026-10-26

## Added durable records

- `users`
- `sessions`
- `inquiries`
- `customers`
- `dealers`
- `cases`
- `idempotencyRecords`
- `serviceConfig`
- `businessConfig`
- `teamProfiles`

## Case-level embedded structures

- assignment metadata
- vehicle brief
- scope versions
- sourcing records
- offer families with version history
- client/staff decisions
- delivery checklist entries
- financial events
- tasks
- client/private progress links (hash-only token storage)
- activity history

## Notes

- Money values are stored in integer cents.
- This migration document is append-only history.
- Future datastore shape changes should be captured in new migration files (e.g. `0002-...md`) without rewriting prior entries.
