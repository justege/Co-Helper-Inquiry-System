import { Router } from "express";
import { query, queryOne, execute, withTransaction } from "../db.js";
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
  listProjectPeople,
  upsertWorkspaceMember,
} from "../lib/workspace.js";
import { sendEmail, appUrl, inviteEmail, sendTestEmail, personLabel, workspaceDisplayName } from "../lib/email.js";
import { encryptSecret } from "../lib/secret.js";
import { createNotification } from "../lib/notifications.js";
import { clientLimitForWorkspace } from "../lib/stripe.js";
import {
  clientInsertValues,
  clientRecordPatch,
  mapWorkspaceBilling,
  workspaceBillingPatch,
} from "../lib/billingProfile.js";
import {
  addProjectBlocker,
  addProjectComment,
  addProjectGoal,
  addProjectMilestone,
  confirmProjectAttachment,
  deleteProjectAttachment,
  deleteProjectBlocker,
  deleteProjectComment,
  deleteProjectGoal,
  deleteProjectMilestone,
  getMilestoneDetail,
  getProjectTicket,
  parseBlockerKind,
  parseCommentBody,
  parseDelayedDays,
  parseItemTitle,
  parseMilestoneDue,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  removeProjectFiles,
  signProjectAttachment,
  updateProjectBlocker,
  updateProjectGoal,
  updateProjectMilestone,
} from "../lib/projectCard.js";

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

function parseInviteEmails(body) {
  const raw = Array.isArray(body?.emails)
    ? body.emails
    : body?.email != null
      ? [body.email]
      : [];
  const filled = raw
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  const emails = [];
  for (const value of filled) {
    const email = parseEmail(value);
    if (!email) return { error: `"${value}" is not a valid email` };
    if (!emails.includes(email)) emails.push(email);
  }
  if (emails.length > 20) return { error: "Invite at most 20 people at a time" };
  return { emails };
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function inviteCollaboratorsToProject({ ws, user, project, emails, strict = false }) {
  const client = await queryOne(`SELECT email FROM clients WHERE id = $1`, [project.client_id]);
  const invitations = [];
  for (const email of emails) {
    if (email === user.email) {
      if (strict) throw httpError(400, "You already own this project");
      continue;
    }
    if (client?.email === email) {
      if (strict) throw httpError(400, "That person is the client on this project");
      continue;
    }
    const existingUser = await queryOne(`SELECT id FROM users WHERE lower(email) = $1`, [email]);
    if (existingUser) {
      const already = await queryOne(
        `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [project.id, existingUser.id]
      );
      if (already) {
        if (strict) throw httpError(409, "Already a collaborator");
        continue;
      }
    }
    invitations.push(await createInvitation({
      ws,
      user,
      email,
      kind: "collaborator",
      projectId: project.id,
    }));
  }
  return invitations;
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
    weeklyHours: ws.weekly_hours != null ? Number(ws.weekly_hours) : 20,
    createdAt: ws.created_at,
    ...mapWorkspaceBilling(ws),
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
  return personLabel(user);
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
  let projectName = null;
  if (inv.project_id) {
    const project = await queryOne("SELECT name FROM projects WHERE id = $1", [inv.project_id]);
    projectName = project?.name || null;
  }
  await sendEmail({
    workspace: ws,
    replyTo: user.email || undefined,
    ...inviteEmail({
      workspaceName: workspaceDisplayName(ws, user),
      freelancerName: freelancerLabel(user),
      inviteUrl,
      email: inv.invited_email,
      kind: inv.kind,
      projectName,
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

    const extra = clientInsertValues(req.body);
    const row = await queryOne(
      `INSERT INTO clients (
         workspace_id, email, first_name, last_name, company_name, phone, notes,
         trade_name, legal_name, street, address_extra, postal_code, city, country,
         vat_id, tax_number, commercial_register, register_court, legal_form,
         contact_person, buyer_reference
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [
        ws.id,
        email,
        extra.first_name,
        extra.last_name,
        extra.company_name,
        extra.phone,
        extra.notes,
        extra.trade_name,
        extra.legal_name,
        extra.street,
        extra.address_extra,
        extra.postal_code,
        extra.city,
        extra.country,
        extra.vat_id,
        extra.tax_number,
        extra.commercial_register,
        extra.register_court,
        extra.legal_form,
        extra.contact_person,
        extra.buyer_reference,
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

    const patch = clientRecordPatch(req.body);
    const sets = ["email = $1"];
    const values = [email];
    let i = 2;
    patch.fields.forEach((column, index) => {
      sets.push(`${column} = $${i++}`);
      values.push(patch.values[index]);
    });
    values.push(existing.id);
    const row = await queryOne(
      `UPDATE clients SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
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

function parseNullableNumber(value, { min = 0, max = 1_000_000 } = {}) {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return { error: "Invalid number" };
  return { value: n };
}

function parseOptionalDate(value) {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { value: null };
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { error: true };
  return { value: s };
}

function parseProjectFields(body, { nameRequired = true } = {}) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (nameRequired && (name.length < 1 || name.length > 80)) {
    return { error: "name must be 1–80 characters" };
  }
  if (!nameRequired && name && (name.length < 1 || name.length > 80)) {
    return { error: "name must be 1–80 characters" };
  }
  const description =
    body?.description == null ? undefined : String(body.description).trim().slice(0, 20000);
  const billingType = body?.billingType;
  if (billingType != null && !["hourly", "fixed", "hybrid"].includes(billingType)) {
    return { error: "billingType must be hourly, fixed, or hybrid" };
  }
  const hourlyRate = parseNullableNumber(body?.hourlyRate, { max: 100000 });
  if (hourlyRate.error) return { error: "hourlyRate is invalid" };
  const fixedPrice = parseNullableNumber(body?.fixedPrice, { max: 10_000_000 });
  if (fixedPrice.error) return { error: "fixedPrice is invalid" };
  const estimatedHours = parseNullableNumber(body?.estimatedHours, { max: 10000 });
  if (estimatedHours.error) return { error: "estimatedHours is invalid" };
  const weeklyHoursTarget = parseNullableNumber(body?.weeklyHoursTarget, { max: 168 });
  if (weeklyHoursTarget.error) return { error: "weeklyHoursTarget is invalid" };
  if (body?.status != null && !PROJECT_STATUSES.includes(body.status)) {
    return { error: "status must be backlog, in_progress, waiting_on_client, or done" };
  }
  if (body?.priority != null && !PROJECT_PRIORITIES.includes(body.priority)) {
    return { error: "priority must be low, medium, or high" };
  }
  const startAt = parseOptionalDate(body?.startAt);
  if (startAt.error) return { error: "startAt must be YYYY-MM-DD" };
  const dueAt = parseOptionalDate(body?.dueAt);
  if (dueAt.error) return { error: "dueAt must be YYYY-MM-DD" };
  return {
    name: name || undefined,
    description,
    billingType: billingType || undefined,
    hourlyRate,
    fixedPrice,
    estimatedHours,
    weeklyHoursTarget,
    status: body?.status || undefined,
    priority: body?.priority || undefined,
    startAt,
    dueAt,
  };
}

function canEditProjectTicket(role) {
  return role === "owner" || role === "admin" || role === "collaborator";
}

function canManageProject(role) {
  return role === "owner" || role === "admin";
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
  const parsed = parseProjectFields(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const inviteEmails = parseInviteEmails(req.body);
  if (inviteEmails.error) return res.status(400).json({ error: inviteEmails.error });
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
      `INSERT INTO projects
         (workspace_id, client_id, name, description, billing_type, hourly_rate, fixed_price, estimated_hours, weekly_hours_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        ws.id,
        client.id,
        parsed.name,
        parsed.description || null,
        parsed.billingType || "hourly",
        parsed.hourlyRate.skip ? null : parsed.hourlyRate.value,
        parsed.fixedPrice.skip ? null : parsed.fixedPrice.value,
        parsed.estimatedHours.skip ? null : parsed.estimatedHours.value,
        parsed.weeklyHoursTarget.skip ? null : parsed.weeklyHoursTarget.value,
      ]
    );
    if (inviteEmails.emails.length) {
      await inviteCollaboratorsToProject({
        ws,
        user: req.dbUser,
        project: row,
        emails: inviteEmails.emails,
      });
    }
    res.status(201).json(mapProject({
      ...row,
      client_email: client.email,
      client_first_name: client.first_name,
      client_last_name: client.last_name,
      client_company_name: client.company_name,
      collaborator_count: 0,
    }));
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message });
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
    const ticket = await getProjectTicket(project.id, req.dbUser);
    const people = await listProjectPeople(project);
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
      people,
      pendingInvites: pending.map(mapInvitation),
      role: access.role,
      meId: req.dbUser.id,
      goals: ticket?.goals ?? [],
      milestones: ticket?.milestones ?? [],
      comments: ticket?.comments ?? [],
      attachments: ticket?.attachments ?? [],
      blockers: ticket?.blockers ?? [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/projects/:id", requireAuth, attachRole, async (req, res) => {
  const parsed = parseProjectFields(req.body, { nameRequired: Boolean(req.body?.name) });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access) return res.status(404).json({ error: "Project not found" });
    if (!canEditProjectTicket(access.role)) {
      return res.status(403).json({ error: "You cannot edit this project" });
    }
    const manage = canManageProject(access.role);
    const sets = [];
    const values = [];
    let i = 1;
    if (parsed.name) {
      sets.push(`name = $${i++}`);
      values.push(parsed.name);
    }
    if (parsed.description !== undefined) {
      sets.push(`description = $${i++}`);
      values.push(parsed.description || null);
    }
    if (parsed.status) {
      sets.push(`status = $${i++}`);
      values.push(parsed.status);
    }
    if (parsed.priority) {
      sets.push(`priority = $${i++}`);
      values.push(parsed.priority);
    }
    if (!parsed.startAt.skip) {
      sets.push(`start_at = $${i++}`);
      values.push(parsed.startAt.value);
    }
    if (!parsed.dueAt.skip) {
      sets.push(`due_at = $${i++}`);
      values.push(parsed.dueAt.value);
    }
    if (req.body?.currentMilestoneId !== undefined) {
      if (req.body.currentMilestoneId === null || req.body.currentMilestoneId === "") {
        sets.push(`current_milestone_id = $${i++}`);
        values.push(null);
      } else {
        const milestone = await queryOne(
          `SELECT id FROM project_milestones WHERE id = $1 AND project_id = $2`,
          [req.body.currentMilestoneId, access.project.id]
        );
        if (!milestone) return res.status(400).json({ error: "Milestone not found on this project" });
        sets.push(`current_milestone_id = $${i++}`);
        values.push(milestone.id);
      }
    }
    if (manage) {
      if (req.body?.clientId) {
        const ws = await ensureOwnerWorkspace(req);
        const client = await queryOne(
          `SELECT id FROM clients WHERE id = $1 AND workspace_id = $2`,
          [req.body.clientId, ws.id]
        );
        if (!client) return res.status(400).json({ error: "That client is not in this workspace" });
        sets.push(`client_id = $${i++}`);
        values.push(client.id);
      }
      if (parsed.billingType) {
        sets.push(`billing_type = $${i++}`);
        values.push(parsed.billingType);
      }
      if (!parsed.hourlyRate.skip) {
        sets.push(`hourly_rate = $${i++}`);
        values.push(parsed.hourlyRate.value);
      }
      if (!parsed.fixedPrice.skip) {
        sets.push(`fixed_price = $${i++}`);
        values.push(parsed.fixedPrice.value);
      }
      if (!parsed.estimatedHours.skip) {
        sets.push(`estimated_hours = $${i++}`);
        values.push(parsed.estimatedHours.value);
      }
      if (!parsed.weeklyHoursTarget.skip) {
        sets.push(`weekly_hours_target = $${i++}`);
        values.push(parsed.weeklyHoursTarget.value);
      }
    }
    if (!sets.length) {
      const full = (await listProjectsForUser(req.dbUser)).find((p) => p.id === access.project.id);
      return res.json(mapProject(full || access.project));
    }
    sets.push("updated_at = NOW()");
    values.push(access.project.id);
    const row = await queryOne(
      `UPDATE projects SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
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
    await removeProjectFiles(access.project.id);
    await withTransaction(async (tx) => {
      await tx.query(`DELETE FROM invoices WHERE project_id = $1`, [access.project.id]);
      await tx.query(`DELETE FROM projects WHERE id = $1`, [access.project.id]);
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    if (err.code === "23503") {
      return res.status(409).json({
        error: "This project cannot be deleted because other records still depend on it.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/collaborators", requireAuth, attachRole, async (req, res) => {
  if (!requireOwner(req, res)) return;
  const parsed = parseInviteEmails(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  if (parsed.emails.length === 0) return res.status(400).json({ error: "A valid email is required" });
  const bulk = Array.isArray(req.body?.emails);
  try {
    const access = await getProjectAccess(req.params.id, req.dbUser);
    if (!access || access.project.owner_id !== req.dbUser.id) {
      return res.status(404).json({ error: "Project not found" });
    }
    const ws = await getWorkspaceByIdOrOwner(req, access.project.workspace_id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });
    const invitations = await inviteCollaboratorsToProject({
      ws,
      user: req.dbUser,
      project: access.project,
      emails: parsed.emails,
      strict: !bulk,
    });
    if (bulk) {
      if (invitations.length === 0) {
        return res.status(400).json({ error: "Nobody new to invite" });
      }
      return res.status(201).json({ invitations: invitations.map(mapInvitation) });
    }
    if (!invitations[0]) return res.status(400).json({ error: "Could not invite that person" });
    res.status(201).json(mapInvitation(invitations[0]));
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message });
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
      `SELECT inv.invited_email, inv.status, inv.kind, p.name AS project_name,
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
       LEFT JOIN projects p ON p.id = inv.project_id
       WHERE inv.token = $1`,
      [req.params.token]
    );
    if (!data || data.status !== "pending") {
      return res.status(404).json({ error: "Invitation not found or already used" });
    }
    res.json({
      email: data.invited_email,
      kind: data.kind,
      workspaceName: workspaceDisplayName(
        { name: data.workspace?.name },
        data.workspace?.owner
      ),
      projectName: data.project_name || null,
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
  if (q.length < 2) return res.json({ projects: [], clients: [], todos: [] });
  const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
  try {
    if (req.userRole === "expert") {
      const ws = await ensureOwnerWorkspace(req);
      const [projects, clients, todos] = await Promise.all([
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
        query(
          `SELECT t.id, t.title, p.name AS project_name
           FROM todos t
           JOIN projects p ON p.id = t.project_id
           WHERE t.workspace_id = $1 AND t.title ILIKE $2
           ORDER BY t.updated_at DESC LIMIT 8`,
          [ws.id, like]
        ),
      ]);
      return res.json({
        projects: projects.map((p) => ({ id: p.id, name: p.name })),
        clients: clients.map(mapClient),
        todos: todos.map((t) => ({ id: t.id, title: t.title, projectName: t.project_name })),
      });
    }
    const [projects, todos] = await Promise.all([
      query(
        `SELECT p.id, p.name
         FROM projects p
         JOIN clients c ON c.id = p.client_id
         WHERE (c.user_id = $1 OR EXISTS (
           SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1
         )) AND p.name ILIKE $2
         ORDER BY p.created_at DESC LIMIT 8`,
        [req.dbUser.id, like]
      ),
      query(
        `SELECT t.id, t.title, p.name AS project_name
         FROM todos t
         JOIN projects p ON p.id = t.project_id
         JOIN clients c ON c.id = p.client_id
         WHERE (
           c.user_id = $1 OR EXISTS (
             SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1
           )
         )
           AND (t.internal = FALSE OR EXISTS (
             SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1
           ))
           AND t.title ILIKE $2
         ORDER BY t.updated_at DESC LIMIT 8`,
        [req.dbUser.id, like]
      ),
    ]);
    res.json({
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
      clients: [],
      todos: todos.map((t) => ({ id: t.id, title: t.title, projectName: t.project_name })),
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
    if (req.body?.weeklyHours != null) {
      const n = Number(req.body.weeklyHours);
      if (!Number.isFinite(n) || n <= 0 || n > 168) {
        return res.status(400).json({ error: "weeklyHours must be between 0 and 168" });
      }
      fields.push(`weekly_hours = $${i++}`);
      values.push(n);
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
    const billing = workspaceBillingPatch(req.body);
    if (billing.error) return res.status(400).json({ error: billing.error });
    billing.fields.forEach((column, index) => {
      fields.push(`${column} = $${i++}`);
      values.push(billing.values[index]);
    });
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

async function loadProjectTicketAccess(req, res, { edit = false } = {}) {
  const access = await getProjectAccess(req.params.id, req.dbUser);
  if (!access) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  if (edit && !canEditProjectTicket(access.role)) {
    res.status(403).json({ error: "You cannot edit this project" });
    return null;
  }
  return access;
}

router.post("/projects/:id/comments", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res);
    if (!access) return;
    const parsed = parseCommentBody(req.body?.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const comment = await addProjectComment({
      project: access.project,
      user: req.dbUser,
      body: parsed.body,
      milestoneId: req.body?.milestoneId || null,
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/projects/:id/comments/:commentId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res);
    if (!access) return;
    const result = await deleteProjectComment({
      commentId: req.params.commentId,
      projectId: access.project.id,
      user: req.dbUser,
      role: access.role,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/goals", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    const parsed = parseItemTitle(req.body?.title);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    res.status(201).json(await addProjectGoal({ project: access.project, title: parsed.title }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/projects/:id/goals/:goalId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    let title;
    if (req.body?.title != null) {
      const parsed = parseItemTitle(req.body.title);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      title = parsed.title;
    }
    const goal = await updateProjectGoal({
      goalId: req.params.goalId,
      projectId: access.project.id,
      title,
      done: req.body?.done,
    });
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    res.json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/projects/:id/goals/:goalId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    const ok = await deleteProjectGoal({ goalId: req.params.goalId, projectId: access.project.id });
    if (!ok) return res.status(404).json({ error: "Goal not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/milestones", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    const parsed = parseItemTitle(req.body?.title);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const due = parseMilestoneDue(req.body?.dueAt);
    if (due.error) return res.status(400).json({ error: due.error });
    res.status(201).json(
      await addProjectMilestone({
        project: access.project,
        title: parsed.title,
        dueAt: due.skip ? null : due.value,
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/projects/:id/milestones/:milestoneId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    let title;
    if (req.body?.title != null) {
      const parsed = parseItemTitle(req.body.title);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      title = parsed.title;
    }
    let dueAt;
    if (req.body?.dueAt !== undefined) {
      const due = parseMilestoneDue(req.body.dueAt);
      if (due.error) return res.status(400).json({ error: due.error });
      dueAt = due.value;
    }
    const milestone = await updateProjectMilestone({
      milestoneId: req.params.milestoneId,
      projectId: access.project.id,
      title,
      dueAt,
      done: req.body?.done,
    });
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });
    res.json(milestone);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/milestones/:milestoneId", requireAuth, attachRole, async (req, res) => {
  try {
    const detail = await getMilestoneDetail({
      projectId: req.params.id,
      milestoneId: req.params.milestoneId,
      user: req.dbUser,
    });
    if (!detail) return res.status(404).json({ error: "Project not found" });
    if (detail.error) return res.status(detail.status || 404).json({ error: detail.error });
    res.json({
      milestone: detail.milestone,
      todos: detail.todos,
      conversations: detail.conversations,
      blockers: detail.blockers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/blockers", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    const parsed = parseItemTitle(req.body?.title);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const kind = parseBlockerKind(req.body?.kind);
    if (kind.error) return res.status(400).json({ error: kind.error });
    const delay = parseDelayedDays(req.body?.delayedDays);
    if (delay.error) return res.status(400).json({ error: delay.error });
    const body = typeof req.body?.body === "string" ? req.body.body.trim().slice(0, 8000) : "";
    const blocker = await addProjectBlocker({
      project: access.project,
      user: req.dbUser,
      title: parsed.title,
      body: body || null,
      kind: kind.value,
      delayedDays: delay.skip ? null : delay.value,
      milestoneId: req.body?.milestoneId || null,
      todoId: req.body?.todoId || null,
    });
    res.status(201).json(blocker);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch("/projects/:id/blockers/:blockerId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    let title;
    if (req.body?.title != null) {
      const parsed = parseItemTitle(req.body.title);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      title = parsed.title;
    }
    if (req.body?.kind != null) {
      const kind = parseBlockerKind(req.body.kind);
      if (kind.error) return res.status(400).json({ error: kind.error });
    }
    const delay = parseDelayedDays(req.body?.delayedDays);
    if (delay.error) return res.status(400).json({ error: delay.error });
    const body =
      req.body?.body === undefined
        ? undefined
        : typeof req.body.body === "string"
          ? req.body.body.trim().slice(0, 8000) || null
          : null;
    const blocker = await updateProjectBlocker({
      blockerId: req.params.blockerId,
      projectId: access.project.id,
      title,
      body,
      kind: req.body?.kind,
      status: req.body?.status,
      delayedDays: delay.skip ? undefined : delay.value,
      milestoneId: req.body?.milestoneId,
      todoId: req.body?.todoId,
    });
    if (!blocker) return res.status(404).json({ error: "Blocker not found" });
    res.json(blocker);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete("/projects/:id/blockers/:blockerId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    const ok = await deleteProjectBlocker({
      blockerId: req.params.blockerId,
      projectId: access.project.id,
    });
    if (!ok) return res.status(404).json({ error: "Blocker not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/projects/:id/milestones/:milestoneId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res, { edit: true });
    if (!access) return;
    const ok = await deleteProjectMilestone({
      milestoneId: req.params.milestoneId,
      projectId: access.project.id,
    });
    if (!ok) return res.status(404).json({ error: "Milestone not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/attachments/sign", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res);
    if (!access) return;
    const result = await signProjectAttachment({
      project: access.project,
      fileName: req.body?.fileName,
      contentType: req.body?.contentType,
      size: req.body?.size,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/attachments", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res);
    if (!access) return;
    const result = await confirmProjectAttachment({
      project: access.project,
      user: req.dbUser,
      filePath: req.body?.filePath,
      fileName: req.body?.fileName,
      contentType: req.body?.contentType,
      size: req.body?.size,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(201).json(result);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That file is already attached" });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/projects/:id/attachments/:attachmentId", requireAuth, attachRole, async (req, res) => {
  try {
    const access = await loadProjectTicketAccess(req, res);
    if (!access) return;
    if (access.role === "client") {
      return res.status(403).json({ error: "Clients cannot remove project files" });
    }
    const row = await deleteProjectAttachment({
      attachmentId: req.params.attachmentId,
      projectId: access.project.id,
    });
    if (!row) return res.status(404).json({ error: "Attachment not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
