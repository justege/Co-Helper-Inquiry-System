-- ============================================================
-- Migration 003: B2B Marketplace Entities
-- Run in Supabase SQL Editor after 001 and 002
-- Idempotent: safe to re-run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Extend users ──────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name   TEXT,
  ADD COLUMN IF NOT EXISTS last_name    TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Migrate member -> client (new role name)
UPDATE users SET role = 'client' WHERE role = 'member';

-- Widen the role CHECK constraint AND update the column default
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'admin', 'client', 'expert'));
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';

-- ── 2. Extend categories ─────────────────────────────────────────────────────

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'service'
    CHECK (type IN ('service', 'tool_sourcing')),
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ── 3. Create ENUMs (idempotent guards) ──────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE inquiry_status AS ENUM (
    'pending', 'matching', 'offered', 'converted', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE business_type AS ENUM ('service', 'tool_sourcing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expert_offer_status AS ENUM (
    'invited', 'submitted', 'rejected', 'accepted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_offer_status AS ENUM (
    'draft', 'sent', 'accepted', 'declined'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'not_started', 'design_phase', 'production',
    'in_transit', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. expert_profiles ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expert_profiles (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio            TEXT,
  location_city  TEXT NOT NULL DEFAULT 'Istanbul',
  capacity_notes TEXT,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;

-- ── 5. inquiries ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiries (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id        UUID NOT NULL REFERENCES categories(id),
  title              VARCHAR(255) NOT NULL,
  description        TEXT NOT NULL,
  type               business_type NOT NULL,
  urgency            urgency_level NOT NULL DEFAULT 'medium',
  target_start_date  DATE,
  target_end_date    DATE,
  estimated_quantity INT,
  status             inquiry_status NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS inquiries_client_idx
  ON inquiries (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inquiries_category_status_idx
  ON inquiries (category_id, status);

CREATE INDEX IF NOT EXISTS inquiries_status_urgency_idx
  ON inquiries (status, urgency, created_at DESC);

-- ── 6. expert_offers ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expert_offers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id              UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  expert_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_price          NUMERIC(10, 2) NOT NULL,
  estimated_lead_time_days INT,
  notes                   TEXT,
  status                  expert_offer_status NOT NULL DEFAULT 'submitted',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_expert_inquiry_offer UNIQUE (inquiry_id, expert_id)
);

ALTER TABLE expert_offers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS expert_offers_inquiry_idx
  ON expert_offers (inquiry_id, status);

CREATE INDEX IF NOT EXISTS expert_offers_expert_idx
  ON expert_offers (expert_id, status);

-- ── 7. project_offers ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_offers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id         UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  total_client_price NUMERIC(10, 2) NOT NULL,
  valid_until        TIMESTAMPTZ,
  status             project_offer_status NOT NULL DEFAULT 'draft',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE project_offers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS project_offers_inquiry_idx
  ON project_offers (inquiry_id, status);

-- ── 8. project_offer_items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_offer_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_offer_id UUID NOT NULL REFERENCES project_offers(id) ON DELETE CASCADE,
  expert_offer_id  UUID NOT NULL REFERENCES expert_offers(id) ON DELETE CASCADE
);

ALTER TABLE project_offer_items ENABLE ROW LEVEL SECURITY;

-- ── 9. projects ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_offer_id        UUID UNIQUE NOT NULL REFERENCES project_offers(id),
  inquiry_id              UUID UNIQUE NOT NULL REFERENCES inquiries(id),
  title                   VARCHAR(255) NOT NULL,
  status                  project_status NOT NULL DEFAULT 'not_started',
  urgency                 urgency_level NOT NULL,
  actual_start_date       DATE,
  expected_delivery_date  DATE,
  actual_end_date         DATE,
  tracking_number         VARCHAR(100),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS projects_status_due_idx
  ON projects (status, expected_delivery_date);
