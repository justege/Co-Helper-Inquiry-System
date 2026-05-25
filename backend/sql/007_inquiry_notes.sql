-- ============================================================
-- Migration 007: Inquiry Notes & Expert Assignment
-- Run in Supabase SQL Editor after 001–006
-- Idempotent: safe to re-run
-- ============================================================

-- ── 1. assigned_expert_id on inquiries ───────────────────────────────────────
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS assigned_expert_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inquiries_assigned_expert_idx
  ON inquiries (assigned_expert_id)
  WHERE assigned_expert_id IS NOT NULL;

-- ── 2. inquiry_notes — internal team collaboration ───────────────────────────
CREATE TABLE IF NOT EXISTS inquiry_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_notes_inquiry_idx
  ON inquiry_notes (inquiry_id, created_at DESC);
