-- Fix: change column default from 'member' to 'client' so new users
-- created after migration 003 pass the updated role CHECK constraint.
-- Safe to run even if 003 was already applied.

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';

-- Also ensure any stale 'member' rows are converted (idempotent).
UPDATE users SET role = 'client' WHERE role = 'member';
