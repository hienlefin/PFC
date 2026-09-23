DROP INDEX IF EXISTS task_comments_task_idx;
DROP TABLE IF EXISTS task_comments;
-- SQLite cannot DROP COLUMN portably; progress column left in place on down.
