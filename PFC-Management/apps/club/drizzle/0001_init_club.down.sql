-- DOWN 0001_init_club
-- NOT DATA-SAFE: drops every Club table. Rows are deleted.
-- Only use on empty/dev DBs or after an explicit backup (DOD-008).
-- FK order: children first.

DROP TABLE IF EXISTS idempotency_keys;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS club_event_links;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS activity_participants;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS task_checklist_items;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS membership_history;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS members;
