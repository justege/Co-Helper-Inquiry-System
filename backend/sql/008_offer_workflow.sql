-- ============================================================
-- Migration 008: Offer Workflow — extended status flow + documents
-- ⚠️  IMPORTANT: Run STEP 1 first, then STEP 2 as a SEPARATE query.
--     PostgreSQL requires enum additions to be committed before the
--     new values can be used in the same session.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- STEP 1 — Run this block first, then click "Run" again for Step 2
-- ════════════════════════════════════════════════════════════

ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'escalated';

ALTER TABLE project_offers ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE project_offers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

CREATE TABLE IF NOT EXISTS inquiry_documents (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id    UUID        NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  uploaded_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name     TEXT        NOT NULL,
  file_path     TEXT        NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  confirmed     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_docs_inquiry_idx
  ON inquiry_documents (inquiry_id, created_at DESC);
