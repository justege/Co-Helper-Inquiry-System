-- ============================================================
-- APPLY PENDING MIGRATIONS (006 → 010)
-- Run this entire file in Supabase → SQL Editor → New query
-- Safe to re-run (idempotent)
-- ============================================================

-- ── 006: Contact fields + team invitations ───────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS contact_pref TEXT NOT NULL DEFAULT 'email'
    CHECK (contact_pref IN ('email', 'phone', 'both'));

CREATE TABLE IF NOT EXISTS team_invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS team_inv_inviter_idx ON team_invitations (inviter_id, status);
CREATE INDEX IF NOT EXISTS team_inv_email_idx   ON team_invitations (invited_email, status);

-- ── 007: Inquiry notes + expert assignment ───────────────────────────────────
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS assigned_expert_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inquiries_assigned_expert_idx
  ON inquiries (assigned_expert_id)
  WHERE assigned_expert_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inquiry_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_notes_inquiry_idx
  ON inquiry_notes (inquiry_id, created_at DESC);

-- ── 008: Offer workflow + inquiry documents ──────────────────────────────────
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'escalated';

ALTER TABLE project_offers ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE project_offers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

CREATE TABLE IF NOT EXISTS inquiry_documents (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id  UUID        NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  uploaded_by UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  file_size   BIGINT,
  mime_type   TEXT,
  confirmed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_docs_inquiry_idx
  ON inquiry_documents (inquiry_id, created_at DESC);

-- ── 008b: Legacy status cleanup ──────────────────────────────────────────────
UPDATE inquiries
SET status = 'accepted'::inquiry_status
WHERE status::text = 'converted';

-- ── 009: Partner services & documents ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT,
  price_from  NUMERIC(12, 2),
  price_to    NUMERIC(12, 2),
  price_unit  TEXT NOT NULL DEFAULT 'piece'
    CHECK (price_unit IN ('piece', 'hour', 'day', 'project', 'kg', 'm2')),
  currency    TEXT NOT NULL DEFAULT 'EUR',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_services_partner_idx
  ON partner_services (partner_id, sort_order);

CREATE TABLE IF NOT EXISTS partner_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   BIGINT,
  mime_type   TEXT,
  doc_type    TEXT NOT NULL DEFAULT 'brochure'
    CHECK (doc_type IN ('brochure', 'certification', 'portfolio', 'price_list', 'other')),
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_docs_partner_idx
  ON partner_documents (partner_id, created_at DESC);

-- ── 010: Drop projects entity (inquiry-only workflow) ────────────────────────
DROP TABLE IF EXISTS projects CASCADE;
DROP TYPE IF EXISTS project_status;

-- ── Refresh PostgREST schema cache (fixes "schema cache" errors) ─────────────
NOTIFY pgrst, 'reload schema';

-- ── 011: Storage buckets for document uploads ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('inquiry-documents', 'inquiry-documents', false, 52428800),
  ('partner-documents', 'partner-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;
