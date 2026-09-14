-- CM-106: append-only audit extras on existing audit_events (0001).
-- Adds queryable bypass flag for SuperAdmin requireClubPermission short-circuit.
ALTER TABLE audit_events ADD COLUMN bypass INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_events(action);
