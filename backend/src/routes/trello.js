import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import { ensureWorkspaceForOwner } from "../lib/workspace.js";
import {
  trelloConfigured,
  trelloApiKey,
  authorizeUrl,
  listBoards,
  listLists,
  getMe,
  createWebhook,
  deleteWebhook,
} from "../lib/trello.js";
import { importBoard, syncCardFromWebhook } from "../lib/trelloImport.js";

const router = Router();

function publicApiBase() {
  return (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, "");
}

function frontendOrigin() {
  return (process.env.TRELLO_RETURN_URL || process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
}

async function requireFreelancerWorkspace(req, res) {
  if (req.userRole !== "expert") {
    res.status(403).json({ error: "Only freelancers can connect Trello" });
    return null;
  }
  const ws = await ensureWorkspaceForOwner(
    req.dbUser.id,
    req.dbUser.company_name || req.dbUser.username
  );
  return ws;
}

router.get("/authorize-url", requireAuth, attachRole, async (req, res) => {
  if (!trelloConfigured()) {
    return res.status(503).json({ error: "TRELLO_API_KEY is not set on the server" });
  }
  const ws = await requireFreelancerWorkspace(req, res);
  if (!ws) return;
  res.json({
    url: authorizeUrl(`${frontendOrigin()}/app/trello`),
    key: trelloApiKey(),
  });
});

router.get("/status", requireAuth, attachRole, async (req, res) => {
  const ws = await requireFreelancerWorkspace(req, res);
  if (!ws) return;
  const conn = await queryOne(
    "SELECT board_id, board_name, webhook_id, trello_member_id, created_at, updated_at FROM trello_connections WHERE workspace_id = $1",
    [ws.id]
  );
  res.json({
    configured: trelloConfigured(),
    connected: Boolean(conn),
    boardId: conn?.board_id ?? null,
    boardName: conn?.board_name ?? null,
    autoSync: Boolean(conn?.webhook_id),
    connectedAt: conn?.created_at ?? null,
  });
});

router.post("/connect", requireAuth, attachRole, async (req, res) => {
  if (!trelloConfigured()) {
    return res.status(503).json({ error: "TRELLO_API_KEY is not set on the server" });
  }
  const ws = await requireFreelancerWorkspace(req, res);
  if (!ws) return;
  const token = req.body?.token?.trim();
  if (!token) return res.status(400).json({ error: "token is required" });
  try {
    const me = await getMe(token);
    await execute(
      `INSERT INTO trello_connections (workspace_id, token, trello_member_id, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (workspace_id) DO UPDATE SET
         token = EXCLUDED.token,
         trello_member_id = EXCLUDED.trello_member_id,
         updated_at = NOW()`,
      [ws.id, token, me.id]
    );
    res.json({ connected: true, member: { id: me.id, name: me.fullName, username: me.username } });
  } catch (err) {
    res.status(400).json({ error: err.message || "Trello token was rejected" });
  }
});

router.delete("/connect", requireAuth, attachRole, async (req, res) => {
  const ws = await requireFreelancerWorkspace(req, res);
  if (!ws) return;
  const conn = await queryOne("SELECT * FROM trello_connections WHERE workspace_id = $1", [ws.id]);
  if (conn?.webhook_id && conn.token) {
    await deleteWebhook(conn.token, conn.webhook_id).catch(() => null);
  }
  await execute("DELETE FROM trello_connections WHERE workspace_id = $1", [ws.id]);
  res.status(204).send();
});

router.get("/boards", requireAuth, attachRole, async (req, res) => {
  const ws = await requireFreelancerWorkspace(req, res);
  if (!ws) return;
  const conn = await queryOne("SELECT token FROM trello_connections WHERE workspace_id = $1", [ws.id]);
  if (!conn) return res.status(400).json({ error: "Connect Trello first" });
  try {
    const boards = await listBoards(conn.token);
    res.json((boards ?? []).filter((b) => !b.closed).map((b) => ({
      id: b.id,
      name: b.name,
      url: b.url,
    })));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get("/boards/:boardId/lists", requireAuth, attachRole, async (req, res) => {
  const ws = await requireFreelancerWorkspace(req, res);
  if (!ws) return;
  const conn = await queryOne("SELECT token FROM trello_connections WHERE workspace_id = $1", [ws.id]);
  if (!conn) return res.status(400).json({ error: "Connect Trello first" });
  try {
    const lists = await listLists(conn.token, req.params.boardId);
    res.json((lists ?? []).map((l) => ({ id: l.id, name: l.name, pos: l.pos })));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post("/import", requireAuth, attachRole, async (req, res) => {
  const ws = await requireFreelancerWorkspace(req, res);
  if (!ws) return;
  const conn = await queryOne("SELECT * FROM trello_connections WHERE workspace_id = $1", [ws.id]);
  if (!conn) return res.status(400).json({ error: "Connect Trello first" });

  const boardId = req.body?.boardId;
  if (!boardId) return res.status(400).json({ error: "boardId is required" });
  const listIds = Array.isArray(req.body?.listIds) ? req.body.listIds : null;
  const clientId = req.body?.clientId || req.dbUser.id;
  const enableAutoSync = req.body?.autoSync !== false;

  try {
    const summary = await importBoard({
      token: conn.token,
      workspace: ws,
      ownerId: req.dbUser.id,
      clientId,
      boardId,
      listIds,
    });

    if (enableAutoSync) {
      if (conn.webhook_id && conn.board_id && conn.board_id !== boardId) {
        await deleteWebhook(conn.token, conn.webhook_id).catch(() => null);
        conn.webhook_id = null;
      }
      if (!conn.webhook_id) {
        try {
          const hook = await createWebhook(conn.token, {
            callbackURL: `${publicApiBase()}/api/trello/webhook`,
            idModel: boardId,
            description: `Co-Helper workspace ${ws.id}`,
          });
          if (hook?.id) {
            await execute(
              "UPDATE trello_connections SET webhook_id = $1, updated_at = NOW() WHERE workspace_id = $2",
              [hook.id, ws.id]
            );
            summary.autoSync = true;
          }
        } catch (hookErr) {
          summary.autoSync = false;
          summary.autoSyncError = hookErr.message;
        }
      } else {
        summary.autoSync = true;
      }
    } else {
      summary.autoSync = Boolean(conn.webhook_id);
    }

    res.json(summary);
  } catch (err) {
    console.error("[trello import]", err);
    res.status(500).json({ error: err.message });
  }
});

// Trello verifies webhooks with a HEAD (and sometimes GET) that must 200.
router.head("/webhook", (_req, res) => res.status(200).end());
router.get("/webhook", (_req, res) => res.status(200).json({ ok: true }));

router.post("/webhook", async (req, res) => {
  res.status(200).json({ ok: true });
  const action = req.body?.action;
  const cardId = action?.data?.card?.id;
  const boardId = action?.data?.board?.id;
  if (!cardId || !boardId) return;

  try {
    const conn = await queryOne(
      `SELECT tc.*, w.owner_id, w.id AS workspace_id, w.name AS workspace_name
       FROM trello_connections tc
       JOIN workspaces w ON w.id = tc.workspace_id
       WHERE tc.board_id = $1`,
      [boardId]
    );
    if (!conn) return;
    await syncCardFromWebhook({
      token: conn.token,
      workspace: { id: conn.workspace_id, name: conn.workspace_name },
      ownerId: conn.owner_id,
      clientId: conn.owner_id,
      cardId,
    });
  } catch (err) {
    console.error("[trello webhook]", err);
  }
});

export default router;
