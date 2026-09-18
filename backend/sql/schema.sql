-- ============================================================
-- Co-Helper — full schema for a new DigitalOcean PostgreSQL database
--
-- Run once against an empty database, e.g.:
--   psql "$DATABASE_URL" -f backend/sql/schema.sql
--   npm run db:setup   (from the backend folder, with .env loaded)
--
-- DigitalOcean: Databases → your cluster → Connection details →
-- Connection string (use the URI, sslmode=require).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE inquiry_status AS ENUM (
    'pending', 'matching', 'offered', 'accepted', 'in_progress',
    'waiting', 'delivered', 'escalated', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'waiting';

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE business_type AS ENUM ('service', 'tool_sourcing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('hourly', 'project');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agreement_status AS ENUM ('proposed', 'agreed', 'declined', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── users ────────────────────────────────────────────────────────────────────

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

-- ── categories ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        UNIQUE NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'service'
              CHECK (type IN ('service', 'tool_sourcing')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_categories (
  user_id     UUID REFERENCES users(id)      ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS category_services (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  slug        TEXT        NOT NULL,
  description TEXT,
  is_live     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS category_services_category_idx
  ON category_services (category_id, sort_order);

-- ── expert / partner ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expert_profiles (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio            TEXT,
  location_city  TEXT NOT NULL DEFAULT 'Remote',
  capacity_notes TEXT,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  score          NUMERIC(3, 1) CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
  score_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── workspaces ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'My workspace',
  currency   TEXT NOT NULL DEFAULT 'EUR',
  timezone   TEXT NOT NULL DEFAULT 'UTC',
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('owner', 'client')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx      ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx ON workspace_members (workspace_id);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Trello list → project inside a freelancer workspace
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  trello_list_id  TEXT,
  trello_board_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, trello_list_id)
);

CREATE INDEX IF NOT EXISTS projects_workspace_idx ON projects (workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS trello_connections (
  workspace_id     UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  token            TEXT NOT NULL,
  trello_member_id TEXT,
  webhook_id       TEXT,
  board_id         TEXT,
  board_name       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── inquiries / jobs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
  category_id         UUID NOT NULL REFERENCES categories(id),
  assigned_expert_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  trello_card_id      TEXT,
  title               VARCHAR(255) NOT NULL,
  description         TEXT NOT NULL,
  type                business_type NOT NULL,
  urgency             urgency_level NOT NULL DEFAULT 'medium',
  target_start_date   DATE,
  target_end_date     DATE,
  estimated_quantity  INT,
  status              inquiry_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiries_client_idx     ON inquiries (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_workspace_idx  ON inquiries (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_status_idx     ON inquiries (status, urgency, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_assigned_expert_idx
  ON inquiries (assigned_expert_id) WHERE assigned_expert_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inquiries_project_idx ON inquiries (project_id);
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_trello_card_uidx
  ON inquiries (trello_card_id) WHERE trello_card_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inquiry_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS inquiry_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id    UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  original_body TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages (inquiry_id, created_at);

CREATE TABLE IF NOT EXISTS inquiry_todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  body        TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trello_checkitem_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiry_todos_inquiry_idx ON inquiry_todos (inquiry_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS inquiry_todos_trello_item_uidx
  ON inquiry_todos (trello_checkitem_id) WHERE trello_checkitem_id IS NOT NULL;

-- ── agreements, hours, payments, activity ────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_agreements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS time_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  todo_id     UUID REFERENCES inquiry_todos(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours       NUMERIC(6, 2) NOT NULL CHECK (hours > 0),
  note        TEXT,
  billable    BOOLEAN NOT NULL DEFAULT TRUE,
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_entries_inquiry_idx ON time_entries (inquiry_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS time_entries_todo_idx ON time_entries (todo_id) WHERE todo_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS activity_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  inquiry_id   UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type         TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_events_inquiry_idx   ON activity_events (inquiry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_workspace_idx ON activity_events (workspace_id, created_at DESC);

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

-- ── seed categories + catalog ────────────────────────────────────────────────

INSERT INTO categories (name, slug, type, description)
VALUES
  ('E-commerce', 'e-commerce', 'service', 'Shopify, WooCommerce, headless storefronts, migrations, subscriptions, and conversion-focused store builds.'),
  ('Full Stack Development', 'full-stack-development', 'service', 'End-to-end web applications — React, Node, APIs, databases, auth, billing, and production deployment.'),
  ('Mobile Apps', 'mobile-apps', 'service', 'Native and cross-platform iOS/Android apps, from MVP prototypes through App Store launch.'),
  ('MVP & Product Builds', 'mvp-product-builds', 'service', 'Scoped SaaS MVPs, startup prototypes, and v1 product delivery with auth, admin, and core workflows.'),
  ('Automation & Integrations', 'automation-integrations', 'service', 'n8n workflows, email automation, CRM integrations, webhooks, and no-code/low-code ops pipelines.'),
  ('SEO & Marketing', 'seo-marketing', 'service', 'Technical SEO, paid search, analytics, and growth strategy for measurable traffic and conversions.'),
  ('Social Media', 'social-media', 'service', 'Content creation, community management, and paid social campaigns across major platforms.'),
  ('Design & Branding', 'design-branding', 'service', 'Brand identity, UI/UX design, marketing creative, and design systems.'),
  ('Content & Email', 'content-email', 'service', 'Copywriting, lifecycle email, newsletters, landing pages, and conversion-focused content.'),
  ('Development', 'development', 'service', 'Web apps, mobile, Chrome extensions, APIs, and custom software.'),
  ('Content', 'content', 'service', 'Copywriting and email campaigns.')
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  type        = EXCLUDED.type,
  description = EXCLUDED.description;

WITH seed_services (cat_slug, name, slug, description, is_live, sort_order) AS (
  VALUES
    ('e-commerce', 'Shopify Store Setup', 'shopify-store-setup', 'Launch a production-ready Shopify store.', TRUE, 1),
    ('e-commerce', 'Shopify Plus Implementation', 'shopify-plus-implementation', 'Enterprise Shopify Plus setup.', TRUE, 2),
    ('e-commerce', 'Custom Theme Development', 'custom-theme-development', 'Bespoke storefront themes.', TRUE, 3),
    ('e-commerce', 'WooCommerce Store Build', 'woocommerce-store-build', 'WordPress + WooCommerce setup.', TRUE, 4),
    ('e-commerce', 'E-commerce Migration', 'e-commerce-migration', 'Migrate products, customers, and orders.', TRUE, 5),
    ('full-stack-development', 'Full Stack Web Application', 'full-stack-web-application', 'React/Next.js + Node builds.', TRUE, 1),
    ('full-stack-development', 'SaaS Platform Build', 'saas-platform-build', 'Multi-tenant SaaS with auth and billing.', TRUE, 2),
    ('full-stack-development', 'REST & GraphQL API Development', 'rest-graphql-api-development', 'Scalable APIs and integrations.', TRUE, 3),
    ('mobile-apps', 'Cross-Platform App (React Native)', 'cross-platform-react-native', 'iOS and Android from one codebase.', TRUE, 1),
    ('mobile-apps', 'Mobile MVP Prototype', 'mobile-mvp-prototype', 'Scoped v1 app with core flows.', TRUE, 2),
    ('mvp-product-builds', 'SaaS MVP Build', 'saas-mvp-build', 'Auth, admin, and one core workflow.', TRUE, 1),
    ('mvp-product-builds', 'Startup Prototype (4-8 weeks)', 'startup-prototype', 'Functional v1 to validate with users.', TRUE, 2),
    ('automation-integrations', 'n8n Workflow Automation', 'n8n-workflow-automation', 'Multi-step workflows and scheduled jobs.', TRUE, 1),
    ('automation-integrations', 'Email Automation Setup', 'email-automation-setup', 'Lifecycle email flows.', TRUE, 2),
    ('seo-marketing', 'Technical SEO Audit', 'technical-seo-audit', 'Crawl analysis and prioritized fixes.', TRUE, 1),
    ('seo-marketing', 'SEO Strategy Package', 'seo-strategy-package', 'Keyword research and content plan.', TRUE, 2),
    ('design-branding', 'UI/UX Design', 'ui-ux-design', 'Wireframes, UI, and prototypes.', TRUE, 1),
    ('design-branding', 'SaaS Product UI Design', 'saas-product-ui-design', 'Dashboard and onboarding flows.', TRUE, 2),
    ('content-email', 'Email Marketing Campaigns', 'email-marketing-campaigns', 'Newsletters and promo campaigns.', TRUE, 1),
    ('content-email', 'Lifecycle & Drip Sequences', 'lifecycle-drip-sequences', 'Welcome and nurture flows.', TRUE, 2)
)
INSERT INTO category_services (category_id, name, slug, description, is_live, sort_order)
SELECT c.id, s.name, s.slug, s.description, s.is_live, s.sort_order
FROM seed_services s
INNER JOIN categories c ON c.slug = s.cat_slug
ON CONFLICT (category_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  is_live     = EXCLUDED.is_live,
  sort_order  = EXCLUDED.sort_order;
