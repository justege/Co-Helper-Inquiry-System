-- ============================================================
-- Migration 013: Freelancer Workspace Pivot
-- Run in Supabase SQL Editor after 001–012
-- Idempotent: safe to re-run
--
-- Pivots Co-Helper from an admin-matched marketplace into a freelancer-owned
-- workspace: each freelancer (role = 'expert') owns exactly one workspace,
-- invites their own clients into it, and runs inquiries as jobs with chat,
-- todos, price agreements, logged hours, and payment records.
--
-- Existing marketplace tables (expert_offers, project_offers, ...) are left
-- untouched. inquiries.workspace_id is nullable so legacy/admin-matched
-- inquiries keep working unchanged.
-- ============================================================

-- ── 1. workspaces ────────────────────────────────────────────────────────────
-- One workspace per freelancer. Clients are invited in as members.

CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'My workspace',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. workspace_members ─────────────────────────────────────────────────────
-- The owner (freelancer) and every invited client share this table so
-- "is this user allowed to see this workspace" is a single lookup.

CREATE TABLE IF NOT EXISTS workspace_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('owner', 'client')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx      ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx ON workspace_members (workspace_id);

-- ── 3. workspace_invitations ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  inviter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS workspace_inv_workspace_idx ON workspace_invitations (workspace_id, status);
CREATE INDEX IF NOT EXISTS workspace_inv_email_idx     ON workspace_invitations (invited_email, status);

-- ── 4. inquiries.workspace_id ────────────────────────────────────────────────
-- Nullable: legacy / admin-matched marketplace inquiries have no owning
-- freelancer workspace and keep working exactly as before.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inquiries_workspace_idx ON inquiries (workspace_id, created_at DESC);

-- ── 5. price_agreements ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('hourly', 'project');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agreement_status AS ENUM ('proposed', 'agreed', 'declined', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS price_agreements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id      UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  proposed_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_type    billing_type NOT NULL,
  hourly_rate     NUMERIC(10, 2),
  estimated_hours NUMERIC(8, 2),
  project_price   NUMERIC(12, 2),
  currency        TEXT NOT NULL DEFAULT 'TRY',
  status          agreement_status NOT NULL DEFAULT 'proposed',
  notes           TEXT,
  agreed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (billing_type = 'hourly'  AND hourly_rate   IS NOT NULL) OR
    (billing_type = 'project' AND project_price IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS price_agreements_inquiry_idx ON price_agreements (inquiry_id, created_at DESC);

-- ── 6. inquiry_messages (job chat) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiry_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id    UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  original_body TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages (inquiry_id, created_at);

-- ── 7. inquiry_todos ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiry_todos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  body        TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_todos_inquiry_idx ON inquiry_todos (inquiry_id, sort_order);

-- ── 8. time_entries ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours       NUMERIC(6, 2) NOT NULL CHECK (hours > 0),
  note        TEXT,
  billable    BOOLEAN NOT NULL DEFAULT TRUE,
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_entries_inquiry_idx ON time_entries (inquiry_id, entry_date DESC);

-- ── 9. payments ───────────────────────────────────────────────────────────────
-- A recorded payment obligation/receipt for a job. Freelancers create and
-- update these manually — Co-Helper never moves money itself.

CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency    TEXT NOT NULL DEFAULT 'TRY',
  status      TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  note        TEXT,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_inquiry_idx ON payments (inquiry_id, created_at DESC);

-- ── 10. activity_events ───────────────────────────────────────────────────────
-- A single append-only log so neither side has to ask "what was decided?"

CREATE TABLE IF NOT EXISTS activity_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  inquiry_id   UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type         TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_events_inquiry_idx   ON activity_events (inquiry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_workspace_idx ON activity_events (workspace_id, created_at DESC);

-- ── 11. Backfill ──────────────────────────────────────────────────────────────
-- Give every existing freelancer (expert) a workspace, add them as the owner
-- member, and — where an inquiry already has an assigned expert from the old
-- marketplace flow — link that inquiry + its client into that workspace.

INSERT INTO workspaces (owner_id, name)
SELECT u.id, COALESCE(NULLIF(TRIM(u.company_name), ''), NULLIF(TRIM(u.username), ''), 'My workspace')
FROM users u
WHERE u.role = 'expert'
ON CONFLICT (owner_id) DO NOTHING;

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM workspaces w
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT DISTINCT w.id, i.client_id, 'client'
FROM inquiries i
JOIN workspaces w ON w.owner_id = i.assigned_expert_id
WHERE i.assigned_expert_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

UPDATE inquiries i
SET workspace_id = w.id
FROM workspaces w
WHERE i.assigned_expert_id = w.owner_id
  AND i.workspace_id IS NULL;

NOTIFY pgrst, 'reload schema';
