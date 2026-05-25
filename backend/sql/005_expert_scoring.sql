-- ============================================================
-- Migration 005: Expert Scoring
-- Run in Supabase SQL Editor after 001–004
-- Idempotent: safe to re-run
-- ============================================================

-- Add score column to expert_profiles (0.0 – 10.0)
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS score NUMERIC(3, 1)
    CHECK (score IS NULL OR (score >= 0 AND score <= 10));

-- Add score_notes for superadmin commentary
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS score_notes TEXT;

-- Add updated_at tracking
ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
