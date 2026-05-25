-- ============================================================
-- Migration 009: Partner Services & Partner Documents
-- Run in Supabase SQL Editor after 001–008
-- Idempotent: safe to re-run
-- ============================================================

-- ── 1. Partner services (listed on their profile) ─────────────────────────────

CREATE TABLE IF NOT EXISTS partner_services (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT,
  price_from  NUMERIC(12, 2),
  price_to    NUMERIC(12, 2),
  price_unit  TEXT        NOT NULL DEFAULT 'piece'
              CHECK (price_unit IN ('piece', 'hour', 'day', 'project', 'kg', 'm2')),
  currency    TEXT        NOT NULL DEFAULT 'EUR',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_services_partner_idx
  ON partner_services (partner_id, sort_order);

-- ── 2. Partner documents (brochures, certifications, portfolios) ──────────────
-- Requires Supabase Storage bucket: "partner-documents" (Public or Private)

CREATE TABLE IF NOT EXISTS partner_documents (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  file_size   BIGINT,
  mime_type   TEXT,
  doc_type    TEXT        NOT NULL DEFAULT 'brochure'
              CHECK (doc_type IN ('brochure', 'certification', 'portfolio', 'price_list', 'other')),
  is_public   BOOLEAN     NOT NULL DEFAULT TRUE,
  confirmed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_docs_partner_idx
  ON partner_documents (partner_id, created_at DESC);
