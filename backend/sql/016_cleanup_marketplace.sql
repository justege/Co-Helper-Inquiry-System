-- ============================================================
-- 016 — Remove legacy marketplace tables; ensure workspace
--        projects / Trello columns exist on incremental DBs.
-- ============================================================

DROP TABLE IF EXISTS project_offer_items;
DROP TABLE IF EXISTS project_offers;
DROP TABLE IF EXISTS expert_offers;
DROP TABLE IF EXISTS partner_documents;
DROP TABLE IF EXISTS partner_services;
DROP TABLE IF EXISTS inquiry_notes;
DROP TABLE IF EXISTS team_invitations;

CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
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

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS trello_card_id TEXT;
ALTER TABLE inquiry_todos ADD COLUMN IF NOT EXISTS trello_checkitem_id TEXT;

CREATE INDEX IF NOT EXISTS inquiries_project_idx ON inquiries (project_id);
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_trello_card_uidx
  ON inquiries (trello_card_id) WHERE trello_card_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inquiry_todos_trello_item_uidx
  ON inquiry_todos (trello_checkitem_id) WHERE trello_checkitem_id IS NOT NULL;
