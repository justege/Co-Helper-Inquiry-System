-- ============================================================
-- Co-Helper — core schema
--
-- User → workspace (settings) → clients → projects → collaborators
--
--   npm run db:setup            apply to an empty database
--   npm run db:reset            drop public schema, then apply
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  TEXT        UNIQUE NOT NULL,
  email         TEXT        NOT NULL,
  username      TEXT,
  avatar_url    TEXT,
  first_name    TEXT,
  last_name     TEXT,
  company_name  TEXT,
  phone         TEXT,
  contact_pref  TEXT        NOT NULL DEFAULT 'email'
                CHECK (contact_pref IN ('email', 'phone', 'both')),
  role          TEXT        NOT NULL DEFAULT 'client'
                CHECK (role IN ('superadmin', 'admin', 'client', 'expert')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx  ON users (role);

CREATE TABLE IF NOT EXISTS workspaces (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL DEFAULT 'My workspace',
  currency           TEXT NOT NULL DEFAULT 'EUR',
  timezone           TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  logo_url           TEXT,
  email_mode         TEXT NOT NULL DEFAULT 'platform'
                     CHECK (email_mode IN ('platform', 'smtp')),
  smtp_host          TEXT,
  smtp_port          INTEGER,
  smtp_user          TEXT,
  smtp_from          TEXT,
  smtp_password_enc  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'client'
               CHECK (role IN ('owner', 'client', 'collaborator')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx      ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx ON workspace_members (workspace_id);

CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  company_name  TEXT,
  phone         TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS clients_workspace_idx ON clients (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS clients_user_idx ON clients (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_workspace_idx ON projects (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_client_idx ON projects (client_id);

CREATE TABLE IF NOT EXISTS project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'collaborator'
              CHECK (role IN ('collaborator')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members (user_id);
CREATE INDEX IF NOT EXISTS project_members_project_idx ON project_members (project_id);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE,
  inviter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email  TEXT NOT NULL,
  kind           TEXT NOT NULL DEFAULT 'client'
                 CHECK (kind IN ('client', 'collaborator')),
  token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS workspace_inv_workspace_idx ON workspace_invitations (workspace_id, status);
CREATE INDEX IF NOT EXISTS workspace_inv_email_idx     ON workspace_invitations (invited_email, status);
CREATE INDEX IF NOT EXISTS workspace_inv_project_idx   ON workspace_invitations (project_id) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan                   TEXT NOT NULL DEFAULT 'intro'
                         CHECK (plan IN ('intro', 'standard')),
  status                 TEXT NOT NULL DEFAULT 'none'
                         CHECK (status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  company    TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
