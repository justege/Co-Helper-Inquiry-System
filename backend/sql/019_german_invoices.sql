-- German invoice fields and ZUGFeRD billing profiles for seller (workspace)
-- and buyer (client). Applied via schema.sql on existing databases.

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
