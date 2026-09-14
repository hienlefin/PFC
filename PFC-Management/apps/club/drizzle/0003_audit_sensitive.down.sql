-- DOWN 0003_audit_sensitive
-- Safe for Club row data: drops audit indexes + bypass column only.
-- Audit rows remain; the bypass flag is lost (reverts to meta_json only).

DROP INDEX IF EXISTS audit_action_idx;
DROP INDEX IF EXISTS audit_actor_idx;
ALTER TABLE audit_events DROP COLUMN bypass;
