import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import {
  ensureWorkspaceForOwner,
  startWorkspaceForUser,
  getWorkspaceByOwner,
  getMembershipsForUser,
  logActivity,
  mapUserBrief,
} from "../lib/workspace.js";

const router = Router();

async function ownerWorkspacePayload(ws) {
  const members = await query(
    `SELECT wm.created_at,
            json_build_object(
              'id', u.id,
              'email', u.email,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'username', u.username,
              'company_name', u.company_name
            ) AS users
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1 AND wm.role = 'client'
     ORDER BY wm.created_at DESC`,
    [ws.id]
  );

  return {
    role: "owner",
    workspace: { id: ws.id, name: ws.name, createdAt: ws.created_at },
    clients: members.map((m) => ({
      ...mapUserBrief(m.users),
      memberSince: m.created_at,
    })),
  };
}

// POST /api/workspace — start (or return) the signed-in user's own workspace
router.post("/", requireAuth, attachRole, async (req, res) => {
  try {
    const ws = await startWorkspaceForUser(req.dbUser, req.body?.name);
    return res.status(201).json(await ownerWorkspacePayload(ws));
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message });
  }
});

// GET /api/workspace/me — the freelancer's own workspace + clients,
// or the list of workspaces a client belongs to.
router.get("/me", requireAuth, attachRole, async (req, res) => {
  try {
    if (req.userRole === "expert") {
      const ws = await ensureWorkspaceForOwner(
        req.dbUser.id,
        req.dbUser.company_name || req.dbUser.username
      );
      return res.json(await ownerWorkspacePayload(ws));
    }

    const memberships = await getMembershipsForUser(req.dbUser.id);
    return res.json({
      role: "client",
      workspaces: memberships
        .filter((m) => m.workspace)
        .map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          freelancer: mapUserBrief(m.workspace.owner),
        })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/projects — Trello-imported (or manually created) projects
router.get("/projects", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can list projects" });
  }
  try {
    const ws = await ensureWorkspaceForOwner(
      req.dbUser.id,
      req.dbUser.company_name || req.dbUser.username
    );
    const rows = await query(
      `SELECT p.id, p.name, p.sort_order, p.trello_list_id, p.trello_board_id, p.created_at,
              COUNT(i.id)::int AS inquiry_count
       FROM projects p
       LEFT JOIN inquiries i ON i.project_id = p.id
       WHERE p.workspace_id = $1
       GROUP BY p.id
       ORDER BY p.sort_order ASC, p.created_at ASC`,
      [ws.id]
    );
    res.json({
      projects: rows.map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: r.sort_order,
        trelloListId: r.trello_list_id,
        trelloBoardId: r.trello_board_id,
        inquiryCount: r.inquiry_count,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/invitations — freelancer's pending invitations
router.get("/invitations", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers manage invitations" });
  }
  try {
    const ws = await ensureWorkspaceForOwner(
      req.dbUser.id,
      req.dbUser.company_name || req.dbUser.username
    );
    const data = await query(
      `SELECT * FROM workspace_invitations
       WHERE workspace_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [ws.id]
    );
    res.json(data.map((inv) => ({
      id: inv.id,
      email: inv.invited_email,
      token: inv.token,
      status: inv.status,
      createdAt: inv.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace/invitations — invite a client by email
router.post("/invitations", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can invite clients" });
  }
  const email = req.body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  try {
    const ws = await ensureWorkspaceForOwner(
      req.dbUser.id,
      req.dbUser.company_name || req.dbUser.username
    );

    const existingMember = await queryOne(
      `SELECT wm.id
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 AND u.email = $2`,
      [ws.id, email]
    );
    if (existingMember) {
      return res.status(409).json({ error: "This client is already in your workspace" });
    }

    const data = await queryOne(
      `INSERT INTO workspace_invitations (workspace_id, inviter_id, invited_email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ws.id, req.dbUser.id, email]
    );

    await logActivity({
      workspaceId: ws.id,
      actorId: req.dbUser.id,
      type: "invitation.sent",
      payload: { email },
    });

    res.status(201).json({
      id: data.id,
      email: data.invited_email,
      token: data.token,
      status: data.status,
      createdAt: data.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspace/invitations/:id — revoke a pending invitation
router.delete("/invitations/:id", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can manage invitations" });
  }
  try {
    const ws = await getWorkspaceByOwner(req.dbUser.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });

    await execute(
      `UPDATE workspace_invitations SET status = 'revoked'
       WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, ws.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/invitations/token/:token — public preview, no auth required
router.get("/invitations/token/:token", async (req, res) => {
  try {
    const data = await queryOne(
      `SELECT inv.invited_email, inv.status,
              json_build_object(
                'name', w.name,
                'owner', json_build_object(
                  'first_name', u.first_name,
                  'last_name', u.last_name,
                  'company_name', u.company_name,
                  'username', u.username
                )
              ) AS workspace
       FROM workspace_invitations inv
       JOIN workspaces w ON w.id = inv.workspace_id
       JOIN users u ON u.id = w.owner_id
       WHERE inv.token = $1`,
      [req.params.token]
    );
    if (!data || data.status !== "pending") {
      return res.status(404).json({ error: "Invitation not found or already used" });
    }
    res.json({
      email: data.invited_email,
      workspaceName: data.workspace?.name ?? null,
      freelancer: mapUserBrief(data.workspace?.owner),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace/invitations/token/:token/accept — join the workspace
router.post("/invitations/token/:token/accept", requireAuth, attachRole, async (req, res) => {
  try {
    const inv = await queryOne(
      `SELECT * FROM workspace_invitations WHERE token = $1`,
      [req.params.token]
    );
    if (!inv || inv.status !== "pending") {
      return res.status(404).json({ error: "Invitation not found or already used" });
    }

    await execute(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'client')
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [inv.workspace_id, req.dbUser.id]
    );

    await execute(
      `UPDATE workspace_invitations
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1`,
      [inv.id]
    );

    await logActivity({
      workspaceId: inv.workspace_id,
      actorId: req.dbUser.id,
      type: "invitation.accepted",
      payload: {},
    });

    res.json({ workspaceId: inv.workspace_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/activity — recent workspace-wide activity (freelancer)
router.get("/activity", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can view workspace activity" });
  }
  try {
    const ws = await ensureWorkspaceForOwner(
      req.dbUser.id,
      req.dbUser.company_name || req.dbUser.username
    );
    const data = await query(
      `SELECT e.id, e.type, e.payload, e.created_at, e.inquiry_id, e.actor_id,
              CASE WHEN u.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', u.id, 'first_name', u.first_name, 'last_name', u.last_name,
                     'company_name', u.company_name, 'email', u.email
                   )
              END AS users
       FROM activity_events e
       LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.workspace_id = $1
       ORDER BY e.created_at DESC
       LIMIT 50`,
      [ws.id]
    );
    res.json(data.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      createdAt: e.created_at,
      inquiryId: e.inquiry_id,
      actorId: e.actor_id,
      actor: mapUserBrief(e.users),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

async function summarizeInquiries(inquiryIds) {
  if (inquiryIds.length === 0) {
    return { jobs: [], totals: { agreedValue: 0, paid: 0, outstanding: 0, remaining: 0, billableHours: 0 } };
  }

  const { computeJobFinance } = await import("../lib/finance.js");

  const [inquiries, agreements, timeEntries, payments] = await Promise.all([
    query(
      `SELECT id, title, status, workspace_id FROM inquiries WHERE id = ANY($1::uuid[])`,
      [inquiryIds]
    ),
    query(
      `SELECT * FROM price_agreements WHERE inquiry_id = ANY($1::uuid[]) AND status = 'agreed'`,
      [inquiryIds]
    ),
    query(
      `SELECT * FROM time_entries WHERE inquiry_id = ANY($1::uuid[])`,
      [inquiryIds]
    ),
    query(
      `SELECT * FROM payments WHERE inquiry_id = ANY($1::uuid[])`,
      [inquiryIds]
    ),
  ]);

  const agreedByInquiry = new Map();
  for (const a of agreements) {
    const prev = agreedByInquiry.get(a.inquiry_id);
    if (!prev || new Date(a.agreed_at) > new Date(prev.agreed_at)) {
      agreedByInquiry.set(a.inquiry_id, a);
    }
  }

  const jobs = inquiries.map((inq) => {
    const snapshot = computeJobFinance({
      agreement: agreedByInquiry.get(inq.id) ?? null,
      timeEntries: timeEntries.filter((e) => e.inquiry_id === inq.id),
      payments: payments.filter((p) => p.inquiry_id === inq.id),
    });
    return {
      inquiryId: inq.id,
      title: inq.title,
      status: inq.status,
      ...snapshot,
    };
  });

  const totals = jobs.reduce(
    (acc, job) => ({
      agreedValue: acc.agreedValue + job.agreedValue,
      paid: acc.paid + job.paid,
      outstanding: acc.outstanding + job.outstanding,
      remaining: acc.remaining + job.remaining,
      billableHours: acc.billableHours + job.billableHours,
    }),
    { agreedValue: 0, paid: 0, outstanding: 0, remaining: 0, billableHours: 0 }
  );

  return { jobs, totals };
}

// GET /api/workspace/finance — freelancer totals across the workspace
router.get("/finance", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can view workspace finance" });
  }
  try {
    const ws = await ensureWorkspaceForOwner(
      req.dbUser.id,
      req.dbUser.company_name || req.dbUser.username
    );
    const inquiries = await query(
      `SELECT id FROM inquiries WHERE workspace_id = $1`,
      [ws.id]
    );
    const summary = await summarizeInquiries(inquiries.map((i) => i.id));
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/finance/mine — client totals across jobs they're on
router.get("/finance/mine", requireAuth, attachRole, async (req, res) => {
  try {
    const inquiries = await query(
      `SELECT id FROM inquiries WHERE client_id = $1`,
      [req.dbUser.id]
    );
    const summary = await summarizeInquiries(inquiries.map((i) => i.id));
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
