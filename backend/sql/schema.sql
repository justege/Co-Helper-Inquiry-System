-- ============================================================
-- Co-Helper — core schema
--
-- User → workspace (settings) → clients → projects → to-dos → hours → invoices
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
  weekly_hours       NUMERIC(6, 2) NOT NULL DEFAULT 20
                     CHECK (weekly_hours > 0 AND weekly_hours <= 168),
  legal_name         TEXT,
  trade_name         TEXT,
  street             TEXT,
  address_extra      TEXT,
  postal_code        TEXT,
  city               TEXT,
  country            TEXT NOT NULL DEFAULT 'DE',
  vat_id             TEXT,
  tax_number         TEXT,
  commercial_register TEXT,
  register_court     TEXT,
  legal_form         TEXT,
  managing_directors TEXT,
  billing_phone      TEXT,
  billing_email      TEXT,
  website            TEXT,
  iban               TEXT,
  bic                TEXT,
  bank_name          TEXT,
  tax_regime         TEXT NOT NULL DEFAULT 'standard'
                     CHECK (tax_regime IN ('standard', 'kleinunternehmer', 'reverse_charge')),
  default_tax_percent NUMERIC(6, 2) NOT NULL DEFAULT 19,
  payment_terms_days INTEGER NOT NULL DEFAULT 14
                     CHECK (payment_terms_days >= 0 AND payment_terms_days <= 365),
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
  trade_name    TEXT,
  legal_name    TEXT,
  phone         TEXT,
  notes         TEXT,
  street        TEXT,
  address_extra TEXT,
  postal_code   TEXT,
  city          TEXT,
  country       TEXT NOT NULL DEFAULT 'DE',
  vat_id        TEXT,
  tax_number    TEXT,
  commercial_register TEXT,
  register_court TEXT,
  legal_form    TEXT,
  contact_person TEXT,
  buyer_reference TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS clients_workspace_idx ON clients (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS clients_user_idx ON clients (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name                 TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'backlog'
                       CHECK (status IN ('backlog', 'in_progress', 'waiting_on_client', 'done')),
  priority             TEXT NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('low', 'medium', 'high')),
  start_at             DATE,
  due_at               DATE,
  billing_type         TEXT NOT NULL DEFAULT 'hourly'
                       CHECK (billing_type IN ('hourly', 'fixed', 'hybrid')),
  hourly_rate          NUMERIC(10, 2),
  fixed_price          NUMERIC(12, 2),
  estimated_hours      NUMERIC(8, 2),
  weekly_hours_target  NUMERIC(6, 2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- Existing databases: add workbench columns if they are missing.
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC(6, 2) NOT NULL DEFAULT 20;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS fixed_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS weekly_hours_target NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'backlog',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS start_at DATE,
  ADD COLUMN IF NOT EXISTS due_at DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS todos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  body             TEXT,
  internal         BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'backlog'
                   CHECK (status IN ('backlog', 'in_progress', 'waiting_on_client', 'done', 'invoiced')),
  estimated_hours  NUMERIC(6, 2),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS todos_project_idx ON todos (project_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS todos_workspace_status_idx ON todos (workspace_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS todos_one_now_per_workspace
  ON todos (workspace_id)
  WHERE status = 'in_progress';

CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  number        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  currency      TEXT NOT NULL DEFAULT 'EUR',
  subtotal      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_percent   NUMERIC(6, 2) NOT NULL DEFAULT 0,
  total         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  issue_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  service_date  DATE,
  service_period_start DATE,
  service_period_end   DATE,
  tax_category  TEXT NOT NULL DEFAULT 'S'
                CHECK (tax_category IN ('S', 'E', 'AE', 'Z', 'O')),
  tax_note      TEXT,
  seller_snapshot JSONB,
  buyer_snapshot  JSONB,
  due_at        DATE,
  sent_at       TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  note          TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, number)
);

CREATE INDEX IF NOT EXISTS invoices_workspace_idx ON invoices (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_project_idx ON invoices (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_client_idx ON invoices (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS time_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  todo_id       UUID REFERENCES todos(id) ON DELETE SET NULL,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours         NUMERIC(6, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  note          TEXT,
  billable      BOOLEAN NOT NULL DEFAULT TRUE,
  invoice_id    UUID REFERENCES invoices(id) ON DELETE SET NULL,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_entries_project_idx ON time_entries (project_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS time_entries_todo_idx ON time_entries (todo_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS time_entries_workspace_week_idx ON time_entries (workspace_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS time_entries_invoice_idx ON time_entries (invoice_id) WHERE invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  todo_id         UUID REFERENCES todos(id) ON DELETE SET NULL,
  time_entry_id   UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  hours           NUMERIC(8, 2) NOT NULL DEFAULT 0,
  rate            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx ON invoice_lines (invoice_id, sort_order);

CREATE TABLE IF NOT EXISTS todo_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id     UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS todo_comments_todo_idx ON todo_comments (todo_id, created_at ASC);

CREATE TABLE IF NOT EXISTS todo_checklist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id     UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS todo_checklist_todo_idx ON todo_checklist_items (todo_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS todo_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id       UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  file_path     TEXT NOT NULL UNIQUE,
  file_name     TEXT NOT NULL,
  content_type  TEXT,
  byte_size     INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS todo_attachments_todo_idx ON todo_attachments (todo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_goals_project_idx ON project_goals (project_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS project_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  due_at        DATE,
  done          BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  DATE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_milestones_project_idx ON project_milestones (project_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS project_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_comments_project_idx ON project_comments (project_id, created_at ASC);

CREATE TABLE IF NOT EXISTS project_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  file_path     TEXT NOT NULL UNIQUE,
  file_name     TEXT NOT NULL,
  content_type  TEXT,
  byte_size     INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_attachments_project_idx ON project_attachments (project_id, created_at DESC);

ALTER TABLE project_milestones
  ADD COLUMN IF NOT EXISTS completed_at DATE;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS todos_milestone_idx ON todos (milestone_id) WHERE milestone_id IS NOT NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS current_milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL;

ALTER TABLE project_comments
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES project_milestones(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS project_comments_milestone_idx
  ON project_comments (milestone_id, created_at ASC) WHERE milestone_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS project_blockers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id  UUID REFERENCES project_milestones(id) ON DELETE CASCADE,
  todo_id       UUID REFERENCES todos(id) ON DELETE SET NULL,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  body          TEXT,
  kind          TEXT NOT NULL DEFAULT 'other'
                CHECK (kind IN ('client', 'scope', 'dependency', 'internal', 'other')),
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved')),
  delayed_days  INTEGER CHECK (delayed_days IS NULL OR (delayed_days >= 0 AND delayed_days <= 3650)),
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS project_blockers_project_idx ON project_blockers (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_blockers_milestone_idx ON project_blockers (milestone_id, status) WHERE milestone_id IS NOT NULL;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE todos SET assignee_id = created_by WHERE assignee_id IS NULL AND created_by IS NOT NULL;

UPDATE todos t
   SET assignee_id = w.owner_id
  FROM workspaces w
 WHERE t.workspace_id = w.id AND t.assignee_id IS NULL;

CREATE INDEX IF NOT EXISTS todos_assignee_idx ON todos (assignee_id) WHERE assignee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS todo_assignees (
  todo_id     UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (todo_id, user_id)
);

CREATE INDEX IF NOT EXISTS todo_assignees_user_idx ON todo_assignees (user_id);

INSERT INTO todo_assignees (todo_id, user_id)
SELECT id, assignee_id FROM todos WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE todo_checklist_items
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'work';

ALTER TABLE todo_checklist_items
  DROP CONSTRAINT IF EXISTS todo_checklist_items_kind_check;

ALTER TABLE todo_checklist_items
  ADD CONSTRAINT todo_checklist_items_kind_check
  CHECK (kind IN ('work', 'acceptance'));

ALTER TABLE todo_checklist_items
  ADD COLUMN IF NOT EXISTS tested_at TIMESTAMPTZ;

ALTER TABLE todo_checklist_items
  ADD COLUMN IF NOT EXISTS tested_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS start_at DATE;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS due_at DATE;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE todos
  DROP CONSTRAINT IF EXISTS todos_priority_check;

ALTER TABLE todos
  ADD CONSTRAINT todos_priority_check
  CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

UPDATE todos t
   SET due_at = m.due_at
  FROM project_milestones m
 WHERE t.milestone_id = m.id
   AND t.due_at IS NULL
   AND m.due_at IS NOT NULL;

UPDATE todos
   SET start_at = created_at::date
 WHERE start_at IS NULL;

UPDATE todos
   SET due_at = (start_at + 4)
 WHERE due_at IS NULL
   AND start_at IS NOT NULL;

UPDATE todos
   SET color = (ARRAY['violet','blue','teal','green','yellow','orange','pink','slate'])[1 + (abs(hashtext(id::text)) % 8)]
 WHERE color IS NULL;

CREATE TABLE IF NOT EXISTS todo_dependencies (
  todo_id        UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  depends_on_id  UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (todo_id, depends_on_id),
  CHECK (todo_id <> depends_on_id)
);

CREATE INDEX IF NOT EXISTS todo_dependencies_on_idx ON todo_dependencies (depends_on_id);

-- Existing databases created invoices.project_id with ON DELETE RESTRICT, which
-- blocked deleting (or cascading updates to) a project that had any invoice.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Pass-through expenses (Supabase, Railway, …) split across projects and invoiced to clients.
CREATE TABLE IF NOT EXISTS expense_vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  note          TEXT,
  kind          TEXT NOT NULL DEFAULT 'split'
                CHECK (kind IN ('split', 'columns')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expense_vendors_workspace_idx
  ON expense_vendors (workspace_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS expense_vendor_splits (
  vendor_id   UUID NOT NULL REFERENCES expense_vendors(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  percent     NUMERIC(6, 2) CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (vendor_id, project_id)
);

CREATE INDEX IF NOT EXISTS expense_vendor_splits_project_idx
  ON expense_vendor_splits (project_id);

CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vendor_id     UUID NOT NULL REFERENCES expense_vendors(id) ON DELETE CASCADE,
  incurred_at   DATE NOT NULL,
  amount        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency      TEXT NOT NULL DEFAULT 'EUR',
  reference     TEXT,
  note          TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_vendor_idx ON expenses (vendor_id, incurred_at DESC);
CREATE INDEX IF NOT EXISTS expenses_workspace_idx ON expenses (workspace_id, incurred_at DESC);

CREATE TABLE IF NOT EXISTS expense_allocations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  invoice_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
  UNIQUE (expense_id, project_id)
);

CREATE INDEX IF NOT EXISTS expense_allocations_project_idx
  ON expense_allocations (project_id, invoice_id);
CREATE INDEX IF NOT EXISTS expense_allocations_invoice_idx
  ON expense_allocations (invoice_id) WHERE invoice_id IS NOT NULL;

ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS expense_allocation_id UUID REFERENCES expense_allocations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoice_lines_expense_idx
  ON invoice_lines (expense_allocation_id) WHERE expense_allocation_id IS NOT NULL;

-- German invoice / ZUGFeRD billing profiles (seller + buyer).
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS address_extra TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'DE',
  ADD COLUMN IF NOT EXISTS vat_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS commercial_register TEXT,
  ADD COLUMN IF NOT EXISTS register_court TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS managing_directors TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_regime TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS default_tax_percent NUMERIC(6, 2) NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER NOT NULL DEFAULT 14;

ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_tax_regime_check;
ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_tax_regime_check
  CHECK (tax_regime IN ('standard', 'kleinunternehmer', 'reverse_charge'));

ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_payment_terms_days_check;
ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_payment_terms_days_check
  CHECK (payment_terms_days >= 0 AND payment_terms_days <= 365);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS address_extra TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'DE',
  ADD COLUMN IF NOT EXISTS vat_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS commercial_register TEXT,
  ADD COLUMN IF NOT EXISTS register_court TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS buyer_reference TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS issue_date DATE,
  ADD COLUMN IF NOT EXISTS service_date DATE,
  ADD COLUMN IF NOT EXISTS service_period_start DATE,
  ADD COLUMN IF NOT EXISTS service_period_end DATE,
  ADD COLUMN IF NOT EXISTS tax_category TEXT NOT NULL DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS tax_note TEXT,
  ADD COLUMN IF NOT EXISTS seller_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS buyer_snapshot JSONB;

UPDATE invoices SET issue_date = created_at::date WHERE issue_date IS NULL;
ALTER TABLE invoices ALTER COLUMN issue_date SET DEFAULT CURRENT_DATE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tax_category_check;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_tax_category_check
  CHECK (tax_category IN ('S', 'E', 'AE', 'Z', 'O'));
