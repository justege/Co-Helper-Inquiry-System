-- Living job workspace: invoices, weekly hours, SMTP, reports, collaboration

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS email_mode TEXT NOT NULL DEFAULT 'platform'
    CHECK (email_mode IN ('platform', 'smtp')),
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from TEXT,
  ADD COLUMN IF NOT EXISTS smtp_password_enc TEXT,
  ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE workspaces ALTER COLUMN timezone SET DEFAULT 'Europe/Istanbul';
UPDATE workspaces SET timezone = 'Europe/Istanbul' WHERE timezone IS NULL OR timezone = 'UTC';

ALTER TABLE price_agreements ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'EUR';

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS working_days TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri']::TEXT[],
  ADD COLUMN IF NOT EXISTS weekly_report_muted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_input_from UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS needs_input_note TEXT;

ALTER TABLE inquiry_todos
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS needs_input_from UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS needs_input_note TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'none'
    CHECK (review_status IN ('none', 'pending', 'approved', 'changes_requested'));

ALTER TABLE inquiry_messages
  ADD COLUMN IF NOT EXISTS todo_id UUID REFERENCES inquiry_todos(id) ON DELETE SET NULL;

ALTER TABLE inquiry_documents
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'none'
    CHECK (review_status IN ('none', 'for_review', 'approved'));

CREATE TABLE IF NOT EXISTS invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id            UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  number                TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  currency              TEXT NOT NULL DEFAULT 'EUR',
  subtotal              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_percent           NUMERIC(6, 2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_at                DATE,
  sent_at               TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  accepted_at           TIMESTAMPTZ,
  note                  TEXT,
  reminder_before_days  INTEGER,
  reminder_every_days   INTEGER,
  last_reminded_at      TIMESTAMPTZ,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inquiry_id, number)
);

CREATE INDEX IF NOT EXISTS invoices_inquiry_idx ON invoices (inquiry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_due_idx ON invoices (status, due_at) WHERE status = 'sent';

CREATE TABLE IF NOT EXISTS invoice_lines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  todo_id        UUID REFERENCES inquiry_todos(id) ON DELETE SET NULL,
  time_entry_id  UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  description    TEXT NOT NULL,
  hours          NUMERIC(8, 2) NOT NULL DEFAULT 0,
  rate           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx ON invoice_lines (invoice_id, sort_order);

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS time_entries_invoice_idx
  ON time_entries (invoice_id) WHERE invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS job_weekly_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inquiry_id, week_start)
);

CREATE INDEX IF NOT EXISTS inquiry_messages_todo_idx
  ON inquiry_messages (todo_id) WHERE todo_id IS NOT NULL;
