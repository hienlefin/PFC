# Club ops runbooks (CM-610 / Gate G6)

## Private membership leak

1. Confirm via audit: `result=deny` / `FORBIDDEN` spikes on `view_members` / private club GET.
2. Rotate session signing secret if cookies may be forged.
3. Soft-lock affected memberships if needed; do **not** DELETE `membership_history`.
4. File incident note + EVD screenshot of metrics (`club.http_403`).

## Mass kick

1. Check `membership.kick` audit volume by actor.
2. Re-activate wrongly kicked members via admin path (`alumni`/`left` → only if FSM allows; otherwise re-invite join).
3. If last owner was targeted, transfer ownership first (last-owner guard should have blocked).

## Bad disband / club_transition

Product rejects club lifecycle mutation (`NOT_SUPPORTED` / ADR-005). If a bad client retries:
1. Confirm API still returns 400.
2. No schema change required; ignore client retries.

## Rollback

1. `npx tsx scripts/migrate.ts down` rolls back one migration version.
2. Feature flags: `CLUB_FLAG_NOTIFY=0`, `CLUB_FLAG_RATE_LIMIT=0`, `CLUB_FLAG_JOBS=0`.
3. Restore SQLite / Turso snapshot before deploy (EVD-CM-06/07).

## Privacy export / delete

1. `export_pii` for subject or `manage_members`.
2. `privacy_anonymize` clears join/reject reasons, marks left, anonymizes profile when no other active memberships.
3. History remains append-only.
