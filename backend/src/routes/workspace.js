import { Router } from "express";
import { query, queryOne, execute } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { attachRole } from "../middleware/requireRole.js";
import {
  ensureWorkspaceForOwner,
  startWorkspaceForUser,
  getWorkspaceByOwner,
  getMembershipsForUser,
  mapUserBrief,
  mapClient,
  mapProject,
  getProjectAccess,
  listProjectsForUser,
  upsertWorkspaceMember,
} from "../lib/workspace.js";
import { sendEmail, appUrl, inviteEmail, sendTestEmail } from "../lib/email.js";
import { encryptSecret } from "../lib/secret.js";
import { createNotification } from "../lib/notifications.js";
import { clientLimitForWorkspace } from "../lib/stripe.js";

const router = Router();

function requireOwner(req, res) {
  if (req.userRole !== "expert") {
    res.status(403).json({ error: "Only workspace owners can do that" });
    return false;
  }
  return true;
}

function parseEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function workspaceSettings(ws) {
  return {
    id: ws.id,
    name: ws.name,
    currency: ws.currency || "EUR",
    timezone: ws.timezone || "Europe/Istanbul",
    logoUrl: ws.logo_url ?? null,
    emailMode: ws.email_mode || "platform",
    smtpHost: ws.smtp_host ?? null,
    smtpPort: ws.smtp_port ?? null,
    smtpUser: ws.smtp_user ?? null,
    smtpFrom: ws.smtp_from ?? null,
    smtpConfigured: Boolean(ws.smtp_password_enc),
    createdAt: ws.created_at,
  };
}

async function listClients(workspaceId) {
  return query(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS project_count
     FROM clients c
     WHERE c.workspace_id = $1
     ORDER BY c.created_at DESC`,
    [workspaceId]
  );
}

async function ownerWorkspacePayload(ws) {
  const clients = await listClients(ws.id);
  return {
    role: "owner",
    workspace: workspaceSettings(ws),
    clients: clients.map(mapClient),
  };
}

async function ensureOwnerWorkspace(req) {
  return ensureWorkspaceForOwner(
    req.dbUser.id,
    req.dbUser.company_name || req.dbUser.username
  );
}

function freelancerLabel(user) {
  return (
    user.company_name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username ||
    "A solo business"
  );
}

function mapInvitation(inv) {
  return {
    id: inv.id,
    email: inv.invited_email,
    token: inv.token,
    kind: inv.kind,
    projectId: inv.project_id ?? null,
    clientId: inv.client_id ?? null,
    status: inv.status,
    createdAt: inv.created_at,
  };
}

async function sendInvite(ws, user, inv) {
  const inviteUrl = appUrl(`/invite/${inv.token}`);
  await sendEmail({
    workspace: ws,
    ...inviteEmail({
      workspaceName: ws.name,
      freelancerName: freelancerLabel(user),
      inviteUrl,
      email: inv.invited_email,
      kind: inv.kind,
    }),
  });
}

async function createInvitation({ ws, user, email, kind, projectId = null, clientId = null }) {
  const existing = await queryOne(
    `SELECT id FROM workspace_invitations
     WHERE workspace_id = $1 AND invited_email = $2 AND kind = $3
       AND COALESCE(project_id::text, '') = COALESCE($4::text, '')
       AND status = 'pending'`,
    [ws.id, email, kind, projectId]
  );
  if (existing) {
    const inv = await queryOne(`SELECT * FROM workspace_invitations WHERE id = $1`, [existing.id]);
    return inv;
  }
  const inv = await queryOne(
    `INSERT INTO workspace_invitations
       (workspace_id, inviter_id, invited_email, kind, project_id, client_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [ws.id, user.id, email, kind, projectId, clientId]
  );
  await sendInvite(ws, user, inv);
  return inv;
}

const CLIENT_SELECT = `
  SELECT c.*,
         (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS project_count
  FROM clients c
`;

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

router.get("/me", requireAuth, attachRole, async (req, res) => {
  try {
    if (req.userRole === "expert") {
      const ws = await ensureOwnerWorkspace(req);
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

router.get("/clients", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const ws = await ensureOwnerWorkspace(req);
    const clients = await listClients(ws.id);
    res.json({ clients: clients.map(mapClient) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/clients", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  const email = parseEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: "A valid email is required" });
  try {
    const ws = await ensureOwnerWorkspace(req);
    const existing = await queryOne(
      `SELECT id FROM clients WHERE workspace_id = $1 AND email = $2`,
      [ws.id, email]
    );
    if (existing) return res.status(409).json({ error: "This client is already in your workspace" });

    const limit = await clientLimitForWorkspace(ws.id);
    const count = await queryOne(
      `SELECT COUNT(*)::int AS count FROM clients WHERE workspace_id = $1`,
      [ws.id]
    );
    if (Number.isFinite(limit) && count.count >= limit) {
      return res.status(402).json({
        error: `Your plan allows ${limit} clients. Upgrade in Settings to add more.`,
      });
    }

    const row = await queryOne(
      `INSERT INTO clients (workspace_id, email, first_name, last_name, company_name, phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        ws.id,
        email,
        typeof req.body?.firstName === "string" ? req.body.firstName.trim().slice(0, 80) || null : null,
        typeof req.body?.lastName === "string" ? req.body.lastName.trim().slice(0, 80) || null : null,
        typeof req.body?.companyName === "string" ? req.body.companyName.trim().slice(0, 120) || null : null,
        typeof req.body?.phone === "string" ? req.body.phone.trim().slice(0, 40) || null : null,
        typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 2000) || null : null,
      ]
    );

    let invitation = null;
    if (req.body?.invite !== false) {
      invitation = await createInvitation({
        ws,
        user: req.dbUser,
        email,
        kind: "client",
        clientId: row.id,
      });
    }

    res.status(201).json({
      client: mapClient({ ...row, project_count: 0 }),
      invitation: invitation ? mapInvitation(invitation) : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/clients/:id", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const ws = await ensureOwnerWorkspace(req);
    const row = await queryOne(
      `${CLIENT_SELECT} WHERE c.id = $1 AND c.workspace_id = $2`,
      [req.params.id, ws.id]
    );
    if (!row) return res.status(404).json({ error: "Client not found" });
    const projects = await query(
      `SELECT p.*,
              (SELECT COUNT(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS collaborator_count
       FROM projects p
       WHERE p.client_id = $1
       ORDER BY p.created_at DESC`,
      [row.id]
    );
    res.json({
      client: mapClient(row),
      projects: projects.map((p) => mapProject({ ...p, client_id: row.id, client: row })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/clients/:id", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const ws = await ensureOwnerWorkspace(req);
    const existing = await queryOne(
      `SELECT * FROM clients WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, ws.id]
    );
    if (!existing) return res.status(404).json({ error: "Client not found" });

    const email = req.body?.email != null ? parseEmail(req.body.email) : existing.email;
    if (!email) return res.status(400).json({ error: "A valid email is required" });

    const row = await queryOne(
      `UPDATE clients SET
         email = $1,
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         company_name = COALESCE($4, company_name),
         phone = COALESCE($5, phone),
         notes = COALESCE($6, notes)
       WHERE id = $7
       RETURNING *`,
      [
        email,
        req.body?.firstName !== undefined ? String(req.body.firstName).trim().slice(0, 80) || null : null,
        req.body?.lastName !== undefined ? String(req.body.lastName).trim().slice(0, 80) || null : null,
        req.body?.companyName !== undefined ? String(req.body.companyName).trim().slice(0, 120) || null : null,
        req.body?.phone !== undefined ? String(req.body.phone).trim().slice(0, 40) || null : null,
        req.body?.notes !== undefined ? String(req.body.notes).trim().slice(0, 2000) || null : null,
        existing.id,
      ]
    );
    const counted = await queryOne(
      `${CLIENT_SELECT} WHERE c.id = $1`,
      [row.id]
    );
    res.json(mapClient(counted));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Another client already uses that email" });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/clients/:id/invite", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const ws = await ensureOwnerWorkspace(req);
    const client = await queryOne(
      `SELECT * FROM clients WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, ws.id]
    );
    if (!client) return res.status(404).json({ error: "Client not found" });
    if (client.user_id) return res.status(409).json({ error: "This client already has an account" });
    const inv = await createInvitation({
      ws,
      user: req.dbUser,
      email: client.email,
      kind: "client",
      clientId: client.id,
    });
    res.status(201).json(mapInvitation(inv));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function parseProjectName(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 80) {
    return { error: "name must be 1–80 characters" };
  }
  const description =
    body?.description == null ? undefined : String(body.description).trim().slice(0, 2000);
  return { name, description };
}

router.get("/projects", requireAuth, attachRole, async (req, res) => {
  try {
    const rows = await listProjectsForUser(req.dbUser);
    res.json({ projects: rows.map(mapProject) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  const parsed = parseProjectName(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const clientId = req.body?.clientId;
  if (typeof clientId !== "string") {
    return res.status(400).json({ error: "clientId is required" });
  }
  try {
    const ws = await ensureOwnerWorkspace(req);
    const client = await queryOne(
      `SELECT * FROM clients WHERE id = $1 AND workspace_id = $2`,
      [clientId, ws.id]
    );
    if (!client) return res.status(400).json({ error: "That client is not in this workspace" });
    const row = await queryOne(
      `INSERT INTO projects (workspace_id, client_id, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ws.id, client.id, parsed.name, parsed.description || null]
    );
    res.status(201).json(mapProject({
      ...row,
      client_email: client.email,
      client_first_name: client.first_name,
      client_last_name: client.last_name,
      client_company_name: client.company_name,
      collaborator_count: 0,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access) return res.status(404).json({ error: "Project not found" });
    const { project } = access;
    const client = await queryOne(`${CLIENT_SELECT} WHERE c.id = $1`, [project.client_id]);
    const collaborators = await query(
      `SELECT pm.created_at,
              json_build_object(
                'id', u.id,
                'email', u.email,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'username', u.username,
                'company_name', u.company_name
              ) AS users
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at ASC`,
      [project.id]
    );
    const pending = await query(
      `SELECT * FROM workspace_invitations
       WHERE project_id = $1 AND kind = 'collaborator' AND status = 'pending'
       ORDER BY created_at DESC`,
      [project.id]
    );
    res.json({
      project: mapProject({
        ...project,
        collaborator_count: collaborators.length,
      }),
      client: mapClient(client),
      collaborators: collaborators.map((m) => ({
        ...mapUserBrief(m.users),
        memberSince: m.created_at,
      })),
      pendingInvites: pending.map(mapInvitation),
      role: access.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/projects/:id", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  const parsed = parseProjectName(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access || access.role === "collaborator" || access.role === "client") {
      return res.status(404).json({ error: "Project not found" });
    }
    const ws = await ensureOwnerWorkspace(req);
    let clientId = access.project.client_id;
    if (req.body?.clientId) {
      const client = await queryOne(
        `SELECT id FROM clients WHERE id = $1 AND workspace_id = $2`,
        [req.body.clientId, ws.id]
      );
      if (!client) return res.status(400).json({ error: "That client is not in this workspace" });
      clientId = client.id;
    }
    const row = await queryOne(
      `UPDATE projects SET name = $1, description = COALESCE($2, description), client_id = $3
       WHERE id = $4
       RETURNING *`,
      [parsed.name, parsed.description ?? null, clientId, access.project.id]
    );
    const full = (await listProjectsForUser(req.dbUser)).find((p) => p.id === row.id);
    res.json(mapProject(full || row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/projects/:id", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access || access.project.owner_id !== req.dbUser.id) {
      return res.status(404).json({ error: "Project not found" });
    }
    await execute(`DELETE FROM projects WHERE id = $1`, [access.project.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/collaborators", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  const email = parseEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: "A valid email is required" });
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access || access.project.owner_id !== req.dbUser.id) {
      return res.status(404).json({ error: "Project not found" });
    }
    const ws = await getWorkspaceByIdOrOwner(req, access.project.workspace_id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });
    if (email === req.dbUser.email) {
      return res.status(400).json({ error: "You already own this project" });
    }
    const client = await queryOne(`SELECT email FROM clients WHERE id = $1`, [access.project.client_id]);
    if (client?.email === email) {
      return res.status(400).json({ error: "That person is the client on this project" });
    }
    const existingUser = await queryOne(`SELECT id FROM users WHERE lower(email) = $1`, [email]);
    if (existingUser) {
      const already = await queryOne(
        `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [access.project.id, existingUser.id]
      );
      if (already) return res.status(409).json({ error: "Already a collaborator" });
    }
    const inv = await createInvitation({
      ws,
      user: req.dbUser,
      email,
      kind: "collaborator",
      projectId: access.project.id,
    });
    res.status(201).json(mapInvitation(inv));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

async function getWorkspaceByIdOrOwner(req, workspaceId) {
  const ws = await queryOne(`SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2`, [
    workspaceId,
    req.dbUser.id,
  ]);
  return ws;
}

router.delete("/projects/:id/collaborators/:userId", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access || access.project.owner_id !== req.dbUser.id) {
      return res.status(404).json({ error: "Project not found" });
    }
    await execute(
      `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [access.project.id, req.params.userId]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/invitations", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const ws = await ensureOwnerWorkspace(req);
    const data = await query(
      `SELECT * FROM workspace_invitations
       WHERE workspace_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [ws.id]
    );
    res.json(data.map(mapInvitation));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/invitations", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  const email = parseEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: "A valid email is required" });
  try {
    const ws = await ensureOwnerWorkspace(req);
    let client = await queryOne(
      `SELECT * FROM clients WHERE workspace_id = $1 AND email = $2`,
      [ws.id, email]
    );
    if (!client) {
      const limit = await clientLimitForWorkspace(ws.id);
      const count = await queryOne(
        `SELECT COUNT(*)::int AS count FROM clients WHERE workspace_id = $1`,
        [ws.id]
      );
      if (Number.isFinite(limit) && count.count >= limit) {
        return res.status(402).json({
          error: `Your plan allows ${limit} clients. Upgrade in Settings to invite more.`,
        });
      }
      client = await queryOne(
        `INSERT INTO clients (workspace_id, email) VALUES ($1, $2) RETURNING *`,
        [ws.id, email]
      );
    }
    if (client.user_id) {
      return res.status(409).json({ error: "This client is already in your workspace" });
    }
    const inv = await createInvitation({
      ws,
      user: req.dbUser,
      email,
      kind: "client",
      clientId: client.id,
    });
    res.status(201).json(mapInvitation(inv));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/invitations/:id", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
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

router.get("/invitations/token/:token", async (req, res) => {
  try {
    const data = await queryOne(
      `SELECT inv.invited_email, inv.status, inv.kind,
              json_build_object(
                'name', w.name,
                'owner', json_build_object(
                  'first_name', u.first_name,
                  'last_name', u.last_name,
                  'company_name', u.company_name,
                  'username', u.username,
                  'email', u.email
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
      kind: data.kind,
      workspaceName: data.workspace?.name ?? null,
      freelancer: mapUserBrief(data.workspace?.owner),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/invitations/token/:token/accept", requireAuth, attachRole, async (req, res) => {
  try {
    const inv = await queryOne(
      `SELECT * FROM workspace_invitations WHERE token = $1`,
      [req.params.token]
    );
    if (!inv || inv.status !== "pending") {
      return res.status(404).json({ error: "Invitation not found or already used" });
    }

    const memberRole = inv.kind === "collaborator" ? "collaborator" : "client";
    await upsertWorkspaceMember(inv.workspace_id, req.dbUser.id, memberRole);

    if (inv.kind === "client") {
      if (inv.client_id) {
        await execute(
          `UPDATE clients SET user_id = $1 WHERE id = $2 AND workspace_id = $3`,
          [req.dbUser.id, inv.client_id, inv.workspace_id]
        );
      } else {
        await execute(
          `UPDATE clients SET user_id = $1
           WHERE workspace_id = $2 AND lower(email) = $3 AND user_id IS NULL`,
          [req.dbUser.id, inv.workspace_id, inv.invited_email]
        );
      }
    }

    if (inv.kind === "collaborator" && inv.project_id) {
      await execute(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'collaborator')
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [inv.project_id, req.dbUser.id]
      );
    }

    await execute(
      `UPDATE workspace_invitations
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1`,
      [inv.id]
    );

    await createNotification({
      userId: inv.inviter_id,
      type: "invitation.accepted",
      title: "Invite accepted",
      body: `${req.dbUser.email} joined your workspace`,
      payload: { workspaceId: inv.workspace_id, projectId: inv.project_id, kind: inv.kind },
    });

    res.json({ workspaceId: inv.workspace_id, projectId: inv.project_id, kind: inv.kind });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/search", requireAuth, attachRole, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return res.json({ projects: [], clients: [] });
  const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
  try {
    if (req.userRole === "expert") {
      const ws = await ensureOwnerWorkspace(req);
      const [projects, clients] = await Promise.all([
        query(
          `SELECT id, name FROM projects
           WHERE workspace_id = $1 AND name ILIKE $2
           ORDER BY created_at DESC LIMIT 8`,
          [ws.id, like]
        ),
        query(
          `SELECT id, email, first_name, last_name, company_name FROM clients
           WHERE workspace_id = $1 AND (
             email ILIKE $2 OR company_name ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2
           )
           ORDER BY created_at DESC LIMIT 8`,
          [ws.id, like]
        ),
      ]);
      return res.json({
        projects: projects.map((p) => ({ id: p.id, name: p.name })),
        clients: clients.map(mapClient),
      });
    }
    const projects = await query(
      `SELECT p.id, p.name
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE (c.user_id = $1 OR EXISTS (
         SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1
       )) AND p.name ILIKE $2
       ORDER BY p.created_at DESC LIMIT 8`,
      [req.dbUser.id, like]
    );
    res.json({
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
      clients: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/settings", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const ws = await ensureOwnerWorkspace(req);
    const fields = [];
    const values = [];
    let i = 1;
    if (typeof req.body?.name === "string" && req.body.name.trim()) {
      fields.push(`name = $${i++}`);
      values.push(req.body.name.trim().slice(0, 80));
    }
    if (typeof req.body?.currency === "string" && req.body.currency.trim()) {
      fields.push(`currency = $${i++}`);
      values.push(req.body.currency.trim().slice(0, 8).toUpperCase());
    }
    if (typeof req.body?.timezone === "string" && req.body.timezone.trim()) {
      fields.push(`timezone = $${i++}`);
      values.push(req.body.timezone.trim().slice(0, 64));
    }
    if (req.body?.emailMode === "platform" || req.body?.emailMode === "smtp") {
      fields.push(`email_mode = $${i++}`);
      values.push(req.body.emailMode);
    }
    if (req.body?.smtpHost !== undefined) {
      fields.push(`smtp_host = $${i++}`);
      values.push(req.body.smtpHost ? String(req.body.smtpHost).trim() : null);
    }
    if (req.body?.smtpPort !== undefined) {
      fields.push(`smtp_port = $${i++}`);
      values.push(req.body.smtpPort ? Number(req.body.smtpPort) : null);
    }
    if (req.body?.smtpUser !== undefined) {
      fields.push(`smtp_user = $${i++}`);
      values.push(req.body.smtpUser ? String(req.body.smtpUser).trim() : null);
    }
    if (req.body?.smtpFrom !== undefined) {
      fields.push(`smtp_from = $${i++}`);
      values.push(req.body.smtpFrom ? String(req.body.smtpFrom).trim() : null);
    }
    if (typeof req.body?.smtpPassword === "string" && req.body.smtpPassword.trim()) {
      fields.push(`smtp_password_enc = $${i++}`);
      values.push(encryptSecret(req.body.smtpPassword.trim()));
    }
    if (!fields.length) return res.json(workspaceSettings(ws));
    values.push(ws.id);
    const row = await queryOne(
      `UPDATE workspaces SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json(workspaceSettings(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/settings/test-email", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  try {
    const ws = await ensureOwnerWorkspace(req);
    const to = parseEmail(req.body?.to) || req.dbUser.email;
    const result = await sendTestEmail(ws, to);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
