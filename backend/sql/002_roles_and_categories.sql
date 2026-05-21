-- Run in Supabase SQL Editor after 001_create_users.sql
-- Dashboard → SQL Editor → New Query → paste & run

-- ── 1. Add role to users ───────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('superadmin', 'admin', 'member'));

-- Re-enable RLS now that the backend uses the service role key
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ── 2. Categories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        UNIQUE NOT NULL,
  slug       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID        REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ── 3. User ↔ Category junction (multi-select) ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_categories (
  user_id     UUID REFERENCES users(id)      ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, category_id)
);

ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
