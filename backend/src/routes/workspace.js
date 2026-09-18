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
  mapProject,
} from "../lib/workspace.js";
import { sendEmail, appUrl, inviteEmail } from "../lib/email.js";
import { createNotification } from "../lib/notifications.js";
import { clientLimitForWorkspace } from "../lib/stripe.js";

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
    workspace: {
      id: ws.id,
      name: ws.name,
      currency: ws.currency || "EUR",
      timezone: ws.timezone || "UTC",
      logoUrl: ws.logo_url ?? null,
      createdAt: ws.created_at,
    },
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

const PROJECT_LIST_SQL = `
  SELECT p.id, p.name, p.description, p.sort_order, p.trello_list_id, p.trello_board_id, p.created_at,
         COUNT(i.id)::int AS inquiry_count
  FROM projects p
  LEFT JOIN inquiries i ON i.project_id = p.id
`;

function parseProjectName(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 80) {
    return { error: "name must be 1–80 characters" };
  }
  return { name };
}

function parseProjectBody(body) {
  const parsed = parseProjectName(body);
  if (parsed.error) return parsed;
  const description =
    body?.description == null ? undefined : String(body.description).trim().slice(0, 2000);
  return { ...parsed, description };
}

async function ownerProject(req, id) {
  const ws = await getWorkspaceByOwner(req.dbUser.id);
  if (!ws) return { error: { status: 404, message: "Workspace not found" } };
  const row = await queryOne(
    `${PROJECT_LIST_SQL} WHERE p.id = $1 AND p.workspace_id = $2 GROUP BY p.id`,
    [id, ws.id]
  );
  if (!row) return { error: { status: 404, message: "Project not found" } };
  return { ws, row };
}

// GET /api/workspace/projects — workspace projects (created here or imported from Trello)
router.get("/projects", requireAuth, attachRole, async (req, res) => {
  try {
    let rows;
    if (req.userRole === "expert") {
      const ws = await ensureWorkspaceForOwner(
        req.dbUser.id,
        req.dbUser.company_name || req.dbUser.username
      );
      rows = await query(
        `${PROJECT_LIST_SQL} WHERE p.workspace_id = $1
         GROUP BY p.id
         ORDER BY p.sort_order ASC, p.created_at ASC`,
        [ws.id]
      );
    } else {
      rows = await query(
        `${PROJECT_LIST_SQL}
         WHERE p.workspace_id IN (
           SELECT workspace_id FROM workspace_members WHERE user_id = $1
         )
         GROUP BY p.id
         ORDER BY p.sort_order ASC, p.created_at ASC`,
        [req.dbUser.id]
      );
    }
    res.json({ projects: rows.map(mapProject) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspace/projects/:id
router.get("/projects/:id", requireAuth, attachRole, async (req, res) => {
  try {
    let row;
    if (req.userRole === "expert") {
      const found = await ownerProject(req, req.params.id);
      if (found.error) return res.status(found.error.status).json({ error: found.error.message });
      row = found.row;
    } else {
      row = await queryOne(
        `${PROJECT_LIST_SQL}
         WHERE p.id = $1 AND p.workspace_id IN (
           SELECT workspace_id FROM workspace_members WHERE user_id = $2
         )
         GROUP BY p.id`,
        [req.params.id, req.dbUser.id]
      );
      if (!row) return res.status(404).json({ error: "Project not found" });
    }
    const jobs = await query(
      `SELECT id, title, status, urgency, created_at FROM inquiries WHERE project_id = $1 ORDER BY created_at DESC`,
      [row.id]
    );
    res.json({
      project: mapProject(row),
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        urgency: j.urgency,
        createdAt: j.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspace/projects — create a project folder for grouping jobs
router.post("/projects", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can create projects" });
  }
  const parsed = parseProjectBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const ws = await ensureWorkspaceForOwner(
      req.dbUser.id,
      req.dbUser.company_name || req.dbUser.username
    );
    const row = await queryOne(
      `INSERT INTO projects (workspace_id, name, description, sort_order)
       VALUES (
         $1, $2, $3,
         (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM projects WHERE workspace_id = $1)
       )
       RETURNING id, name, description, sort_order, trello_list_id, trello_board_id, created_at`,
      [ws.id, parsed.name, parsed.description || null]
    );
    res.status(201).json({ ...mapProject(row), inquiryCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/workspace/projects/:id — rename
router.patch("/projects/:id", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can edit projects" });
  }
  const parsed = parseProjectBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const found = await ownerProject(req, req.params.id);
    if (found.error) return res.status(found.error.status).json({ error: found.error.message });
    const row = await queryOne(
      `UPDATE projects SET name = $1, description = COALESCE($2, description) WHERE id = $3
       RETURNING id, name, description, sort_order, trello_list_id, trello_board_id, created_at`,
      [parsed.name, parsed.description ?? null, found.row.id]
    );
    res.json({ ...mapProject(row), inquiryCount: found.row.inquiry_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspace/projects/:id — jobs keep running; they just leave the project
router.delete("/projects/:id", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only freelancers can delete projects" });
  }
  try {
    const found = await ownerProject(req, req.params.id);
    if (found.error) return res.status(found.error.status).json({ error: found.error.message });
    await execute(`DELETE FROM projects WHERE id = $1`, [found.row.id]);
    res.status(204).send();
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

    const memberCount = await queryOne(
      `SELECT COUNT(*)::int AS count FROM workspace_members WHERE workspace_id = $1 AND role = 'client'`,
      [ws.id]
    );
    const pendingCount = await queryOne(
      `SELECT COUNT(*)::int AS count FROM workspace_invitations WHERE workspace_id = $1 AND status = 'pending'`,
      [ws.id]
    );
    const limit = await clientLimitForWorkspace(ws.id);
    if (Number.isFinite(limit) && (memberCount.count + pendingCount.count) >= limit) {
      return res.status(402).json({
        error: `Your plan allows ${limit} clients. Upgrade in Settings to invite more.`,
      });
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

    const freelancerName =
      req.dbUser.company_name ||
      [req.dbUser.first_name, req.dbUser.last_name].filter(Boolean).join(" ") ||
      req.dbUser.username ||
      "A solo business";
    const inviteUrl = appUrl(`/invite/${data.token}`);
    await sendEmail(inviteEmail({
      workspaceName: ws.name,
      freelancerName,
      inviteUrl,
      email,
    }));

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

    await createNotification({
      userId: inv.inviter_id,
      type: "invitation.accepted",
      title: "Invite accepted",
      body: `${req.dbUser.email} joined your workspace`,
      payload: { workspaceId: inv.workspace_id },
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

router.get("/search", requireAuth, attachRole, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return res.json({ jobs: [], projects: [], clients: [], messages: [] });
  const like = `%${q.replace(/%/g, "")}%`;
  try {
    let workspaceIds = [];
    if (req.userRole === "expert") {
      const ws = await getWorkspaceByOwner(req.dbUser.id);
      if (ws) workspaceIds = [ws.id];
    } else {
      const rows = await query(
        `SELECT workspace_id FROM workspace_members WHERE user_id = $1`,
        [req.dbUser.id]
      );
      workspaceIds = rows.map((r) => r.workspace_id);
    }
    if (workspaceIds.length === 0) return res.json({ jobs: [], projects: [], clients: [], messages: [] });

    const [jobs, projects, clients, messages] = await Promise.all([
      query(
        `SELECT id, title, status FROM inquiries
         WHERE workspace_id = ANY($1::uuid[]) AND (title ILIKE $2 OR description ILIKE $2)
         ORDER BY updated_at DESC LIMIT 8`,
        [workspaceIds, like]
      ),
      query(
        `SELECT id, name FROM projects
         WHERE workspace_id = ANY($1::uuid[]) AND name ILIKE $2
         LIMIT 8`,
        [workspaceIds, like]
      ),
      req.userRole === "expert"
        ? query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.company_name
             FROM workspace_members wm
             JOIN users u ON u.id = wm.user_id
             WHERE wm.workspace_id = ANY($1::uuid[]) AND wm.role = 'client'
               AND (u.email ILIKE $2 OR u.company_name ILIKE $2 OR u.first_name ILIKE $2 OR u.last_name ILIKE $2)
             LIMIT 8`,
            [workspaceIds, like]
          )
        : Promise.resolve([]),
      query(
        `SELECT m.id, m.body, m.inquiry_id, i.title
         FROM inquiry_messages m
         JOIN inquiries i ON i.id = m.inquiry_id
         WHERE i.workspace_id = ANY($1::uuid[]) AND m.body ILIKE $2
         ORDER BY m.created_at DESC LIMIT 6`,
        [workspaceIds, like]
      ),
    ]);

    res.json({
      jobs: jobs.map((j) => ({ id: j.id, title: j.title, status: j.status })),
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
      clients: clients.map((c) => ({
        id: c.id,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        companyName: c.company_name,
      })),
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body.slice(0, 140),
        inquiryId: m.inquiry_id,
        title: m.title,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/settings", requireAuth, attachRole, async (req, res) => {
  if (req.userRole !== "expert") {
    return res.status(403).json({ error: "Only workspace owners can update settings" });
  }
  try {
    const ws = await getWorkspaceByOwner(req.dbUser.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });
    const fields = [];
    const values = [];
    let i = 1;
    if (typeof req.body?.name === "string" && req.body.name.trim()) {
      fields.push(`name = $${i++}`);
      values.push(req.body.name.trim().slice(0, 80));
    }
    if (typeof req.body?.currency === "string" && /^[A-Z]{3}$/.test(req.body.currency)) {
      fields.push(`currency = $${i++}`);
      values.push(req.body.currency);
    }
    if (typeof req.body?.timezone === "string" && req.body.timezone.trim()) {
      fields.push(`timezone = $${i++}`);
      values.push(req.body.timezone.trim().slice(0, 64));
    }
    if (fields.length === 0) return res.status(400).json({ error: "Nothing to update" });
    values.push(ws.id);
    const row = await queryOne(
      `UPDATE workspaces SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json({
      id: row.id,
      name: row.name,
      currency: row.currency,
      timezone: row.timezone,
      logoUrl: row.logo_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
