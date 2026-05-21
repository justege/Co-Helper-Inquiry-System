-- Run this once in Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → paste & run

CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT        UNIQUE NOT NULL,
  email        TEXT        NOT NULL,
  username     TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth is handled by Express + Firebase, so disable Supabase RLS on this table.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
