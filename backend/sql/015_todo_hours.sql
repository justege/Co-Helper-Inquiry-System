-- ============================================================
-- Migration 015: Hours on to-dos
-- Run after 014
-- Idempotent: safe to re-run
--
-- Time entries can be attached to a specific to-do on the same job.
-- Deleting the to-do keeps the hours on the job (todo_id becomes null).
-- ============================================================

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS todo_id UUID REFERENCES inquiry_todos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS time_entries_todo_idx
  ON time_entries (todo_id)
  WHERE todo_id IS NOT NULL;
