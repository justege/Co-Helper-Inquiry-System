-- ============================================================
-- Migration 006: Team Invitations & Contact Preferences
-- Run in Supabase SQL Editor after 001–005
-- Idempotent: safe to re-run
-- ============================================================

-- ── 1. Contact fields on users ───────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS contact_pref   TEXT NOT NULL DEFAULT 'email'
    CHECK (contact_pref IN ('email', 'phone', 'both'));

-- ── 2. team_invitations ───────────────────────────────────────────────────────
-- A user can invite another email to join their "team" (same company workspace).
-- On acceptance the invited user's company_name is set to match the inviter's.
CREATE TABLE IF NOT EXISTS team_invitations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS team_inv_inviter_idx ON team_invitations (inviter_id, status);
CREATE INDEX IF NOT EXISTS team_inv_email_idx   ON team_invitations (invited_email, status);
